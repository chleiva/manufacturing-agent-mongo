
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi
import time
import os
uri = os.getenv("MONGODB_URI")


client = MongoClient(uri, server_api=ServerApi('1'))
    

# MongoDB connection helper function
def insert_document_chunk_to_mongo(file_name, page, H1, H2, H3, text, embedding, doc_name, doc_type, doc_description, manufacturer, model):

    database_name = "manufacturing_database"
    document_chunks_collection = "documents_chunks"

    db = client[database_name]  # Your database name
    collection = db[document_chunks_collection]  # Your collection name
    
    # Prepare the document to be inserted
    document = {
        "file_name": file_name,
        "page": page,
        "H1": H1,
        "H2": H2,
        "H3": H3,
        "text": text,
        "vector": embedding,
        "doc_name": doc_name,
        "doc_type": doc_type,
        "doc_description": doc_description,
        "manufacturer": manufacturer,
        "model": model
    }

    # Insert the document into MongoDB
    result = collection.insert_one(document)
    print(f"Inserted document with ID: {result.inserted_id}")

def get_all_documents():
    database_name = "manufacturing_database"
    document_collection = "documents"

    db = client[database_name]
    collection = db[document_collection]

    # Retrieve all documents
    documents = list(collection.find())

    print(f"Retrieved {len(documents)} documents.")
    return documents


# MongoDB connection helper function
def insert_document_to_mongo(file_name, doc_name, doc_type, doc_description, manufacturer, model):

    database_name = "manufacturing_database"
    document_collection = "documents"

    db = client[database_name]  # Your database name
    collection = db[document_collection]  # Your collection name
    
    # Prepare the document to be inserted
    document = {
        "file_name": file_name,
        "doc_name": doc_name,
        "doc_type": doc_type,
        "doc_description": doc_description,
        "manufacturer": manufacturer,
        "model": model
    }

    # Insert the document into MongoDB
    result = collection.insert_one(document)
    print(f"Inserted document with ID: {result.inserted_id}")



def insert_update_request(user_id, request_id, update_text, completed = False):
    database_name = "chatbot"
    collection_name = "user_requests"

    db = client[database_name]
    collection = db[collection_name]

    current_time = int(time.time())

    result = collection.update_one(
        {"user_id": user_id, "request_id": request_id},
        {
            "$push": {
                "updates": {
                    "update": update_text,
                    "time_stamp": current_time
                }
            },
             "$set": {
                "completed": completed
            }
        },
        upsert=True
    )

    if result.upserted_id:
        print(f"Created new document with ID: {result.upserted_id}")
    else:
        print("Appended update to existing document.")
