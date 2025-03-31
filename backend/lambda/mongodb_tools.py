
from pymongo.mongo_client import MongoClient
from pymongo.server_api import ServerApi

database_name = "manufacturing_database"
document_chunks_collection = "documents_chunks"
document_collection = "documents"


# MongoDB connection helper function
def insert_document_to_mongo(doc_name, page, H1, H2, H3, text, embedding):
    # MongoDB connection string (ensure to replace <db_password> with your password)
    uri = "mongodb+srv://chleiva:nZAyQIy0c5VV1QDw@cluster0.8xirq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    
    # Create MongoDB client and connect to the server
    client = MongoClient(uri, server_api=ServerApi('1'))
    db = client[database_name]  # Your database name
    collection = db[document_chunks_collection]  # Your collection name
    
    # Prepare the document to be inserted
    document = {
        "doc_name": doc_name,
        "page": page,
        "H1": H1,
        "H2": H2,
        "H3": H3,
        "text": text,
        "vector": embedding  # Store the embedding vector
    }

    # Insert the document into MongoDB
    result = collection.insert_one(document)
    print(f"Inserted document with ID: {result.inserted_id}")