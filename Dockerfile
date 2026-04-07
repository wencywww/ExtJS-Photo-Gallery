############################
# Stage 1: Composer build
############################
FROM composer:2 AS composer

WORKDIR /app/libraries/php

# Build Composer dependancies
COPY app/libraries/php/composer.json \
     app/libraries/php/composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader



############################
# Stage 2: Runtime image
############################
FROM php:8.4-apache-trixie


# PHP extensions needed for gallery
RUN apt-get update && apt-get install -y \
    libjpeg-dev \
    libpng-dev \
    libwebp-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install gd exif \
    && rm -rf /var/lib/apt/lists/*

# Enable mod_headers for Cache-Control on JS/CSS files
RUN a2enmod headers

# Apache cache-control config
COPY docker/docker-apache-cache.conf /etc/apache2/conf-available/gallery-cache.conf
RUN a2enconf gallery-cache

# PHP ini overrides
COPY docker/docker-php.ini /usr/local/etc/php/conf.d/99-gallery.ini

# Application code
COPY app/ /var/www/html/

# Vendor from within the Composer stage
COPY --from=composer \
  /app/libraries/php/vendor \
  /var/www/html/libraries/php/vendor

# Entrypoint
COPY docker/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /var/www/html

RUN chmod -R 777 /var/www/html/data

ENTRYPOINT ["/entrypoint.sh"]
CMD ["apache2-foreground"]