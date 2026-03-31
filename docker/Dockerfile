FROM php:8.2-apache

RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

RUN apt-get update && apt-get install -y --no-install-recommends \
    $PHPIZE_DEPS \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libgmp-dev \
    libxml2-dev \
    zip \
    unzip \
    vim \
    sudo \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg

RUN docker-php-ext-install -j$(nproc) \
    gd \
    zip \
    intl \
    bcmath \
    exif \
    gmp \
    pdo_mysql \
    opcache \
    pcntl

RUN pecl install apcu redis \
 && docker-php-ext-enable apcu redis

# APCu para CLI (necessário para occ)
RUN echo "apc.enable_cli=1" > /usr/local/etc/php/conf.d/apcu-cli.ini

RUN a2enmod rewrite headers env dir mime

RUN { \
    echo 'memory_limit=512M'; \
    echo 'upload_max_filesize=10G'; \
    echo 'post_max_size=10G'; \
    echo 'max_execution_time=3600'; \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
} > /usr/local/etc/php/conf.d/nextcloud.ini

COPY . /var/www/html/

RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]