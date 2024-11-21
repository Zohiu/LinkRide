FROM python:3.11
WORKDIR /linkride

COPY . /linkride

EXPOSE 8001
CMD ["./start.sh"]