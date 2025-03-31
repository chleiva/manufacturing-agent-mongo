import json
import boto3
import re
import voyageai
from mongodb_tools import insert_document_to_mongo 


#----- Helper Functions


def create_embeddings(text):
    vo = voyageai.Client()
    result = vo.embed([text], model="voyage-3")
    embedding = result.embeddings[0]
    return embedding

def extract_first_xml_element(input_str):
    """
    Extracts:
    1. Text within the first pair of XML-like tags.
    2. The tag name.
    3. The remaining string after the closing tag.
    
    Args:
        input_str (str): The input string to process.
        
    Returns:
        tuple: (inner_text, tag_name, remaining_text) or (None, None, None) if not found
    """
    # Find the first opening tag
    start_tag_open = input_str.find('<')
    if start_tag_open == -1:
        return None, None, None
    
    start_tag_close = input_str.find('>', start_tag_open)
    if start_tag_close == -1:
        return None, None, None
    
    # Extract potential tag name
    tag_name = input_str[start_tag_open + 1:start_tag_close]
    
    # Validate tag name (must be non-empty and contain only word characters)
    if not tag_name or not all(char.isalnum() or char == '_' for char in tag_name):
        return None, None, None
    
    # Find closing tag
    closing_tag = f"</{tag_name}>"
    end_tag_open = input_str.find(closing_tag, start_tag_close)
    if end_tag_open == -1:
        return None, None, None
    
    # Extract inner text
    inner_text = input_str[start_tag_close + 1:end_tag_open]
    
    # Extract remaining text
    end_tag_close = end_tag_open + len(closing_tag)
    remaining_text = input_str[end_tag_close:]
    
    return inner_text, tag_name, remaining_text







def invoke_claude_sonnet_37(prompt):
    """
    Invokes the Anthropic Claude 3 Sonnet model via AWS Bedrock to generate a response.

    :param prompt: A string representing the user query.
    :return: A string containing the AI-generated response.
    """
    # Create a Bedrock Runtime client in the AWS Region of your choice.
    client = boto3.client("bedrock-runtime")

    # Set the model ID for Claude 3 Sonnet.
    model_id = "us.anthropic.claude-3-7-sonnet-20250219-v1:0"

    
    # Configure reasoning parameters with a 2000 token budget
    reasoning_config = {
        "thinking": {
            "type": "enabled",
            "budget_tokens": 2000
        }
    }

    # Define the request payload in the required format.
    native_request = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 10000,
        "temperature": 0,
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": prompt}],
            }
        ],
    }

    try:
        # Invoke the model with the request.
        response = client.invoke_model(modelId=model_id, body=json.dumps(native_request))
        model_response = json.loads(response["body"].read())

        # Extract and return the response text.
        return model_response["content"][0]["text"]

    except Exception as e:
        print(f"ERROR: Unable to invoke Claude 3 Sonnet. Reason: {str(e)}")
        return f"ERROR: {str(e)}"






#----- Document Chunking


def chuck_document(extracted_doc, doc_name):
    formated_doc = ""
    for i, page_text in enumerate(extracted_doc):
        print(f"\n Processing 📄 Page {i + 1} — {len(page_text)} characters")

        prompt = f"""
        <CURRENT_PAGE>
        {page_text}
        </CURRENT_PAGE>


        TASK
        ----
        You are processing a large OCR extracted document, the objective is to organize the document into relevant sections focusing on the current page provided in tags <CURRENT_PAGE>, following these rules:

        RULES
        -----
        - if you identify a Main Heading, write it verbatim in tags <H1></H1>
        - if you identify a Section Heading, write it verbatim in tags <H2></H2>
        - if you identify a Sub-Section Heading, write it verbatim in tags <H3></H3>
        - if you identify any body text or block of text, write it verbatim in tags <BODY></BODY>
        - All the content in tags <CURRENT_PAGE> must be included in your output.
        - In your output, the only allowed tags you can write are <H1></H1>, <H2></H2>, <H3></H3> and <BODY></BODY>.
        - Excludde any character/text that it is obviously invalid (any OCR extraction inconsistentcy).
        """
        response = invoke_claude_sonnet_37(prompt)
        formated_doc += f"\n<PAGE>{i+1}</PAGE>\n"
        formated_doc += response

    doc = formated_doc
    H1 = ""
    H2 = ""
    H3 = ""
    page = ""

    #print(f"Doc to be processed:\n{doc}")

    structured_document = []

    while (doc):
        text, tag, doc = extract_first_xml_element(doc)

        #print(f"tag = {tag} \n text ={text} ")
         
        if tag == "H1":
            H1 = text
        if tag == "H2":
            H2 = text
        if tag == "H3":
            H3 = text
        if tag == "PAGE":
            page = text
        if tag == "BODY":
            sub_chunk = {
                "H1": H1,
                "H2": H2,
                "H3": H3,
                "page": page,
                "text": text
            }
            structured_document.append(sub_chunk)


    # To group contiguous <BODY> with same H1, H2, H3, and track the initial page
    temp_body = ""
    last_h1, last_h2, last_h3, initial_page = "", "", "", ""

    for sub_chunk in structured_document:
        # Check if we are continuing the same section (same H1, H2, H3)
        if sub_chunk["H1"] == last_h1 and sub_chunk["H2"] == last_h2 and sub_chunk["H3"] == last_h3:
            # If it's the same section, accumulate the body text
            temp_body += "\n" + sub_chunk["text"]
        else:
            # If it's a new section, process the previous accumulated body text as a chunk
            if temp_body:
                process_chunk(doc_name, last_h1, last_h2, last_h3, initial_page, temp_body)
            # Reset for the new section
            last_h1, last_h2, last_h3, initial_page = sub_chunk["H1"], sub_chunk["H2"], sub_chunk["H3"], sub_chunk["page"]
            temp_body = sub_chunk["text"]  # Start accumulating new body text

    # Process any remaining body content in temp_body after the loop ends
    if temp_body:
        process_chunk(doc_name, last_h1, last_h2, last_h3, initial_page, temp_body)





def process_chunk(doc_name, H1, H2, H3, page, text):
    text_to_embed = f"{H1} {H2} {H3} {text}"

    #creates vector embeddings
    embedding = create_embeddings(text_to_embed)

    #now stores the document chunk to MongoDB
    insert_document_to_mongo(doc_name, page, H1, H2, H3, text, embedding)

