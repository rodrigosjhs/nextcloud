FROM php:8.2-apache

# evitar warning apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# dependências do sistema
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

# configurar GD
RUN docker-php-ext-configure gd --with-freetype --with-jpeg

# extensões PHP necessárias
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

# cache recomendado
RUN pecl install apcu \
    && docker-php-ext-enable apcu

# redis (opcional - recomendado para nextcloud)
RUN pecl install redis \
    && docker-php-ext-enable redis

# habilitar módulos apache
RUN a2enmod rewrite headers env dir mime

# configuração PHP recomendada
RUN { \
    echo 'memory_limit=512M'; \
    echo 'upload_max_filesize=10G'; \
    echo 'post_max_size=10G'; \
    echo 'max_execution_time=3600'; \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
    } > /usr/local/etc/php/conf.d/nextcloud.ini

# copiar código nextcloud
COPY . /var/www/html/

# permissões
RUN chown -R www-data:www-data /var/www/html

WORKDIR /var/www/html

EXPOSE 80

# CMD ["apache2-foreground"]

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]