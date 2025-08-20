import json
from typing import Any, Dict

import boto3

from backend.core.config import get_settings
from backend.services.email import send_reset_email, send_verification_email


class MQWorker:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.sqs = boto3.client(
            "sqs",
            endpoint_url=self.settings.mq_endpoint,
            region_name=self.settings.mq_region,
            aws_access_key_id=self.settings.mq_access_key_id,
            aws_secret_access_key=self.settings.mq_secret_access_key,
        )

    def handle_message(self, body: Dict[str, Any]) -> None:
        msg_type = body.get("type")
        if msg_type == "email_verification":
            to = body.get("to")
            code = body.get("code")
            if to and code:
                print(f"[Worker] Verification code for {to}: {code}")
                send_verification_email(to, code)
        elif msg_type == "password_reset":
            to = body.get("to")
            link = body.get("link")
            if to and link:
                print(f"[Worker] Password reset link for {to}: {link}")
                send_reset_email(to, link)

    def run_forever(self) -> None:
        while True:
            resp = self.sqs.receive_message(
                QueueUrl=self.settings.mq_queue_url,
                MaxNumberOfMessages=10,
                WaitTimeSeconds=10,
                VisibilityTimeout=30,
            )
            for m in resp.get("Messages", []):
                receipt = m["ReceiptHandle"]
                try:
                    body = json.loads(m["Body"])
                    self.handle_message(body)
                    self.sqs.delete_message(
                        QueueUrl=self.settings.mq_queue_url, ReceiptHandle=receipt
                    )
                except Exception as e:
                    print(f"[Worker] Error processing message: {e}")


if __name__ == "__main__":
    MQWorker().run_forever()
