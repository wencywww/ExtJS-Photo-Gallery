# ExtJS Photo/Video Gallery

This Docker image provides an **ExtJS Photo Gallery** built with PHP 8.4 and Sencha ExtJS as frontend. No database is required.

## Features

* Organize and browse your photos/videos in a hierarchical (tree) view using any desktop browser
* Items are automatically arranged by Year, Month and Day based on the EXIF information (if available)
* The data view can display items for particular day/month/year or all available items
* Slideshow available via Fancybox
* Photo geographical locations (latitude/longitude/altitude) can be fine-tuned if needed via intuitive Google Maps or Open Street Map-based editor
* The EXIF data and location of the currently active slide can be visualized using a grid & Google Maps / Open Street Map panel (using [ExifReader](https://github.com/mattiasw/ExifReader) JS library)
* File uploading via [DropZone.js](https://www.dropzonejs.com/)
* Automatic thumbnail creation
* Ability to delete, rotate and change the date of the item/items manually
* Ability to recursively traverse the uploads directory for photos/videos in subdirs
* Ability to show only videos or only photos
* Ability to paginate large dataviews
* Photos with GPS data can be indicated on the thumbnails
* The GUI supports English and Bulgarian Language
* **No database required!** (but SQLite indexing is possible and recommended for galleries with large number of files)

It's ready to run, but requires a local configuration file and a folder for your photos.

A valid Google API Key with access to Maps JavaScript API is also required if you want to use Google as Map provider. [Get your own here](https://developers.google.com/maps/documentation/javascript/get-api-key). Otherwise, use the default Open Street Map provider. 

---

## Quick Start

Follow these steps to get your gallery up and running.

### 1. Create a local directory and configuration file

Create a directory of your choice (for example, `ext-gallery`) - it will contain your photos and videos (in subdirectory `gallery_data` in this example), as well as the initial gallery configuration:
```bash
mkdir ~/ext-gallery
mkdir ~/ext-gallery/gallery_data
chmod -R 777 ~/ext-gallery/gallery_data
```

Create a file called `~/ext-gallery/gallery-config.php` in the same directory and set your personal settings:
```php
<?php
// Set your timezone
// This is important and affects the date for the items!!!
ini_set('date.timezone', 'Europe/Sofia');

// Defaults for username/password of the web interface
$glob['usr'] = "admin";
$glob['pass'] = "admin";

// Map provider: "OSM" (OpenStreetMap, no API key needed) or "GM" (Google Maps)
$glob['mapsProvider'] = "OSM";

// Google Maps API key — only needed when mapsProvider is "GM"
$glob['gmapsApiKey'] = "place-your-own-api-key-here";
```

### 2. Start the container

To start the container via the command line, issue this command:
```bash
docker run -d \
  --name gallery \
  -p 8080:80 \
  -v ~/ext-gallery/gallery-config.php:/var/www/html/inc/globals/gallery-config.php \
  -v ~/ext-gallery/gallery_data:/var/www/html/data/photos \
  wencywwww/extjs-photo-gallery
```

Or, if you prefer to use Docker Compose instead, create the file `~/ext-gallery/docker-compose.yml` as follows:
```yaml
services:
  gallery:
    image: wencywwww/extjs-photo-gallery
    container_name: gallery
    ports:
      - "8080:80"
    volumes:
      - ./gallery-config.php:/var/www/html/inc/globals/gallery-config.php:ro
      - ./gallery_data:/var/www/html/data/photos
    restart: unless-stopped
```

and simply execute:
```bash
docker compose up -d
```

### 3. Open the gallery

Point your browser to the IP address of your Docker host, for example: `http://localhost:8080` or `http://host-ip:8080` and use the username and password set within `gallery-config.php`.

---

## Important Notes

* The timezone setting in `gallery-config.php` is critical as it affects how dates are displayed and organized
* Make sure the `gallery_data` directory has proper write permissions (777 or appropriate for your system)
* Both volume mounts are required for the container to function properly
* The default map provider is **OpenStreetMap** (no API key required). To use Google Maps instead, set `$glob['mapsProvider'] = "GM"` and replace `place-your-own-api-key-here` with your actual Google Maps API key