import json

def handler(event, context):
    try:
        body = json.loads(event.get("body", "{}"))
        message = body.get("message", "")

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": event['headers'].get('origin', '*'),
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Content-Type": "text/plain"
            },
            "body": f"Sam received: '{message}'"
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": str(e)
        }
