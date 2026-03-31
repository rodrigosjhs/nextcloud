FROM php:8.2-apache

RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# Dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    $PHPIZE_DEPS \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libgmp-dev \
    libxml2-dev \
    libonig-dev \
    libpq-dev \
    zip \
    unzip \
    vim \
    sudo \
    netcat-openbsd \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# GD
RUN docker-php-ext-configure gd --with-freetype --with-jpeg

# Extensões PHP necessárias para Nextcloud
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

# APCu + Redis
RUN pecl install apcu redis \
 && docker-php-ext-enable apcu redis

# APCu para CLI (necessário para occ)
RUN echo "apc.enable_cli=1" > /usr/local/etc/php/conf.d/apcu-cli.ini

# Apache modules
RUN a2enmod rewrite headers env dir mime remoteip

# Configuração PHP otimizada para Nextcloud
RUN { \
    echo 'memory_limit=512M'; \
    echo 'upload_max_filesize=10G'; \
    echo 'post_max_size=10G'; \
    echo 'max_execution_time=3600'; \
    echo 'max_input_time=3600'; \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=10000'; \
    echo 'opcache.revalidate_freq=60'; \
} > /usr/local/etc/php/conf.d/nextcloud.ini

# Copia aplicação
COPY . /var/www/html/

# Permissões
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

# Entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]