import json
import smtplib
from email.message import EmailMessage
from email.utils import formatdate, make_msgid

import boto3

from backend.core.config import get_settings


def send_verification_email(to_email: str, code: str) -> None:
    settings = get_settings()

    subject = "CookBook: ваш код подтверждения"
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=settings.smtp_from.split("@")[-1])
    msg["Reply-To"] = settings.smtp_from
    msg["X-Mailer"] = "CookBook"

    text = (
        f"Здравствуйте!\n\n"
        f"Ваш код подтверждения: {code}\n"
        f"Срок действия: 15 минут.\n\n"
        f"Если вы не запрашивали код, просто игнорируйте это письмо.\n"
        f"— CookBook"
    )

    msg.set_content(text)

    if not settings.smtp_user or not settings.smtp_password:
        print(f"[DEV] Would send code {code} to {to_email}")
        return

    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


def send_reset_email(to_email: str, link: str) -> None:
    settings = get_settings()

    subject = "CookBook: ссылка для сброса пароля"
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=settings.smtp_from.split("@")[-1])
    msg["Reply-To"] = settings.smtp_from

    text = (
        "Здравствуйте!\n\n"
        f"Для сброса пароля перейдите по ссылке: {link}\n"
        "Срок действия ссылки: 30 минут. Ссылка одноразовая.\n\n"
        "Если вы не запрашивали сброс — проигнорируйте письмо.\n"
        "— CookBook"
    )
    html = f"""
    <html>
      <body>
        <p>Здравствуйте!</p>
        <p>Для сброса пароля перейдите по ссылке:<br/>
           <a href="{link}" target="_blank">Сбросить пароль</a></p>
        <p>Срок действия ссылки: 30 минут. Ссылка одноразовая.</p>
        <p>Если вы не запрашивали сброс — проигнорируйте письмо.</p>
        <p>— CookBook</p>
      </body>
    </html>
    """.strip()

    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    if not settings.smtp_user or not settings.smtp_password:
        print(f"[DEV] Would send reset link to {to_email}: {link}")
        return

    with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port) as server:
        server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


def publish_verification_email(to_email: str, code: str) -> None:
    settings = get_settings()
    if not (
        settings.mq_queue_url
        and settings.mq_access_key_id
        and settings.mq_secret_access_key
    ):
        return send_verification_email(to_email, code)

    sqs = boto3.client(
        "sqs",
        endpoint_url=settings.mq_endpoint or None,
        region_name=settings.mq_region,
        aws_access_key_id=settings.mq_access_key_id,
        aws_secret_access_key=settings.mq_secret_access_key,
    )
    body = json.dumps({"type": "email_verification", "to": to_email, "code": code})
    sqs.send_message(QueueUrl=settings.mq_queue_url, MessageBody=body)


def publish_reset_email(to_email: str, link: str) -> None:
    settings = get_settings()
    if not (
        settings.mq_queue_url
        and settings.mq_access_key_id
        and settings.mq_secret_access_key
    ):
        return send_reset_email(to_email, link)
    sqs = boto3.client(
        "sqs",
        endpoint_url=settings.mq_endpoint or None,
        region_name=settings.mq_region,
        aws_access_key_id=settings.mq_access_key_id,
        aws_secret_access_key=settings.mq_secret_access_key,
    )
    body = json.dumps({"type": "password_reset", "to": to_email, "link": link})
    sqs.send_message(QueueUrl=settings.mq_queue_url, MessageBody=body)
