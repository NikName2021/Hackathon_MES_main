FROM python:3.10-slim

RUN apt-get update

COPY requirements.txt .
RUN pip install -r requirements.txt
WORKDIR /app