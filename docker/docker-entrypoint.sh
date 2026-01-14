#!/bin/sh
set -e

CONFIG_DIR=/var/www/html/inc/globals
CONFIG_FILE=$CONFIG_DIR/gallery-config.php
SAMPLE_FILE=$CONFIG_DIR/gallery-config.sample.php

if [ ! -f "$CONFIG_FILE" ]; then
  echo "================================================="
  echo "ERROR: Missing configuration file!"
  echo
  echo "Expected:"
  echo "  $CONFIG_FILE"
  echo
  echo "Create it by copying:"
  echo "  $SAMPLE_FILE -> gallery-config.php"
  echo
  echo "Then mount the config directory:"
  echo "  -v /path/on/host/gallery-config.php:$CONFIG_FILE"
  echo "================================================="
  exit 1
fi

exec "$@"
