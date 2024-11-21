#!/bin/bash

chmod +x start.sh
docker stop linkride
docker rm linkride
docker build -t linkride .
docker run -d --name linkride -p 8001:8001 linkride