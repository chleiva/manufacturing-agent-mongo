from embedding import invoke_claude_x, get_tag, create_embeddings
from mongodb_tools import get_all_documents, search_chunks
from s3_presigned import replace_sources_with_links


def determine_action(user_input, recent_history, context):
    available_docs = get_all_documents()

    # Format each document into a readable string
    formatted_docs = []
    for doc in available_docs:
        doc_name = f"doc_name:'{doc.get('doc_name', 'Unnamed Document')}'"
        manufacturer = doc.get("manufacturer", "")
        model = doc.get("model", "")
        description = doc.get("doc_description", "")

        # Build string: doc_name (manufacturer model): description
        parts = [doc_name]
        if manufacturer or model:
            parts.append(f"({manufacturer} {model})".strip())
        if description:
            parts.append(f": {description.strip()}")

        formatted_docs.append(" ".join(parts).strip())

    # Join all formatted docs into a single string with line breaks
    available_docs_text = "\n".join(formatted_docs)

    # Final prompt
    prompt = f"""
        # Document Assistant Prompt

        <CONVERSATION_HISTORY>
        {recent_history}
        </CONVERSATION_HISTORY>

        <USER_QUERY>
        {user_input}
        </USER_QUERY>

        <AVAILABLE_DOCS>
        {available_docs_text}
        </AVAILABLE_DOCS>

        <VALID_SOURCES>
        {context}
        </VALID_SOURCES>

        ## TASK
        You are a document retrieval assistant. Your job is to help users find information from documents or answer questions directly when possible.

        For each user query, follow these steps in order:

        1. ANALYZE: Carefully analyze the user query and conversation history to understand the user's information need.
        - Identify the core information request or question
        - Consider relevant context from the conversation history
        - Determine if the query can be answered with available information

        2. IMPROVE QUERY: Rewrite the user query to make it clearer and more precise. Include only strictly necessary context from the conversation history.
        - Focus on key terms that will help retrieve relevant documents
        - Ensure the improved query maintains the original intent
        - Output this improved query within <IMPROVED_USER_QUERY> tags

        3. DECIDE ACTION: Choose EXACTLY ONE of the following actions based on the query:
                
            A. QUERY_DOCS: When specific documents are needed to answer the query
                - Choose this when the retrieved documentation is insufficient or when specific documents are needed
                - Identify the document IDs from <AVAILABLE_DOCS> that are most relevant
                - List these document references within <DOCS> tags (pipe-separated if multiple)
                - Think about specific search text that would help find the exact information needed and write it in tags <SEARCH_FOR>.
                - If all documents might be relevant or you're unsure, write * (wildcard)
                - End with <ACTION>QUERY_DOCS</ACTION>
                    
            B. INVALID: When the query is general knowledge, unrelated to available documents or misuses the application
                - Choose this only when the query is completely outside the scope of available documentation
                - End with <ACTION>INVALID</ACTION>
                    
            C. QUESTION: When the query is valid but unclear or needs clarification
                - Choose this when you need specific clarification to provide a helpful response
                - Write a clear, specific clarifying question within <QUESTION> tags
                - Focus on the exact information needed to address the user's query
                - End with <ACTION>QUESTION</ACTION>
                    
            D. RESPOND: When you can fully answer using information already available
                - Choose this when the information in <VALID_SOURCES> or <CONVERSATION_HISTORY> is sufficient
                - Write your complete, precise and succinct answer within <ANSWER> tags in markdown format
                - Base your answer SOLELY on information from <VALID_SOURCES>, <CONVERSATION_HISTORY>, or <AVAILABLE_DOCS>
                - NEVER fabricate or invent information not present in the provided content
                - You must use quotes and cite specific VALID SOURCES using the following format: <SOURCE doc_file_name='filename.pdf' page='123'>your quoted text here</SOURCE>
                - Format information clearly with headings, lists, or code blocks as needed
                - End with <ACTION>RESPOND</ACTION>

        ## RESPONSE FORMAT
        Your response must follow this exact structure:

        <IMPROVED_USER_QUERY>
        [Write improved version of user query]
        </IMPROVED_USER_QUERY>

        Then EXACTLY ONE of these options:

        Option 1:
        <DOCS>[document ID|...  or *]</DOCS>
        <SEARCH_FOR>[specific search text]</SEARCH_FOR>
        <ACTION>QUERY_DOCS</ACTION>

        Option 2:
        <ACTION>INVALID</ACTION>

        Option 3:
        <QUESTION>[clarifying question]</QUESTION>
        <ACTION>QUESTION</ACTION>

        Option 4:
        <ANSWER>[Final response to the user question in markdown with <SOURCE doc_file_name='<filename>' page='<page_number>'...> citatioms]</ANSWER>
        <ACTION>RESPOND</ACTION>
    """

    response = invoke_claude_x(prompt)
    action = get_tag(response, "ACTION")
    docs = get_tag(response, "DOCS")
    question = get_tag(response, "QUESTION")
    improved_query = get_tag(response, "IMPROVED_USER_QUERY")
    answer = get_tag(response, "ANSWER")
    search_for = get_tag(response, "SEARCH_FOR")
    docs = get_tag(response, "DOCS")
    if docs == "*":
        docs = []
    else:
        docs = docs.split("|")
        docs = [doc.strip() for doc in docs]
    #creates presigned urls
    answer = replace_sources_with_links(answer)
    return action, docs, question, improved_query, answer, search_for, docs




def retrieve_chunks(search_text, document_list):

    #calculate embeddings for the search text
    search_embedding = create_embeddings(search_text)

    #perform hybrid search in MongoDB (Vector Search and by doc_name)
    search_results = search_chunks(search_embedding, document_list, 5)

    return search_results




def agent_loop(user_input, conversation_history):
    context = ""
    # Main loop for the agent
    safe_stop = 5
    safe_stop_counter = 0
    while True:
        # Determine action and context
        action, docs, question, improved_query, answer, search_for, docs = determine_action(user_input, conversation_history, context)
        safe_stop_counter += 1
        if safe_stop_counter > safe_stop:
            #print("I'm sorry, I could not determine a valid response.")
            return "I'm sorry, I could not determine a valid response."
        if action == "INVALID":
            #print("I'm sorry, I can't help with that..")
            return "I'm sorry, I can't help with that.."
        # Handle invalid action
        elif action == "QUESTION":
            #print(question)
            return question
        elif action == "RESPOND":
            #print(answer)
            return answer
        # Handle respond action
        elif action == "QUERY_DOCS":
            search_results = retrieve_chunks(search_for, docs)
            context = ""
            for result in search_results:
                context += f"""
                            <SOURCE doc="{result['file_name']}" page="{result['page']}">
                            <EXCERPT>
                            {result['text']}
                            </EXCERPT>
                            </SOURCE>
                            """


