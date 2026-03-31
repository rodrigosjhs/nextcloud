#!/bin/bash
set -e

# Inicia o Apache em background
apache2-foreground &

echo "Aguardando Nextcloud iniciar..."
sleep 20

CONFIG_FILE="/var/www/html/config/config.php"

if [ -f "$CONFIG_FILE" ]; then
    echo "Configurando trusted domains..."
    sudo -u www-data php /var/www/html/occ config:system:set trusted_domains 0 --value="localhost" || true
    sudo -u www-data php /var/www/html/occ config:system:set trusted_domains 1 --value="intranet.loglabprojetos.com.br" || true

    echo "Configurando overwrite protocol e host..."
    sudo -u www-data php /var/www/html/occ config:system:set overwriteprotocol --value="https" || true
    sudo -u www-data php /var/www/html/occ config:system:set overwritehost --value="intranet.loglabprojetos.com.br" || true
    sudo -u www-data php /var/www/html/occ config:system:set overwrite.cli.url --value="https://intranet.loglabprojetos.com.br" || true

    echo "Configurando trusted proxies..."
    sudo -u www-data php /var/www/html/occ config:system:set trusted_proxies 0 --value="10.10.100.35" || true
    sudo -u www-data php /var/www/html/occ config:system:set trusted_proxies 1 --value="10.10.100.30" || true
    sudo -u www-data php /var/www/html/occ config:system:set trusted_proxies 2 --value="10.0.0.0/8" || true
    sudo -u www-data php /var/www/html/occ config:system:set trusted_proxies 3 --value="172.16.0.0/12" || true
    sudo -u www-data php /var/www/html/occ config:system:set trusted_proxies 4 --value="192.168.0.0/16" || true

    echo "Configurando URL de login Loglab..."
    sudo -u www-data php /var/www/html/occ config:system:set loglab_auth_login_url --value="https://infra.loglabprojetos.com.br/microsservices/auth/login" || true

    echo "Ativando tema Loglab..."
    sudo -u www-data php /var/www/html/occ app:enable loglab_theme || true

    echo "Apps instalados:"
    sudo -u www-data php /var/www/html/occ app:list | grep loglab || true
fi

# Mantém o Apache em primeiro plano
wait