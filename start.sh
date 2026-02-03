#!/bin/bash
cd /home/ubuntu/clawd/mission-control-ui
export PORT=3456
export $(cat .env.local | xargs)
npm start
