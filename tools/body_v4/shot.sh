#!/bin/bash
# usage: shot.sh out.png "query"
D=$(mktemp -d); google-chrome --user-data-dir=$D --headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars --window-size=1920,1038 --virtual-time-budget=60000 --screenshot="$1" "http://localhost:8765/tools/body_v4/studio.html?$2&cb=$RANDOM$RANDOM" 2>/dev/null
rm -rf $D
