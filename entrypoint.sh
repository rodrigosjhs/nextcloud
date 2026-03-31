#!/bin/bash
set -e

echo "Iniciando Apache..."
apache2-foreground &
APACHE_PID=$!

CONFIG_FILE="/var/www/html/config/config.php"

echo "Aguardando Nextcloud inicializar..."

for i in {1..60}; do
    if [ -f "$CONFIG_FILE" ]; then
        echo "Nextcloud detectado."
        break
    fi
    sleep 2
done

occ() {
    sudo -u www-data php /var/www/html/occ "$@"
}

if [ -f "$CONFIG_FILE" ]; then

    echo "Configurando trusted domains..."
    occ config:system:set trusted_domains 0 --value="localhost" || true
    occ config:system:set trusted_domains 1 --value="intranet.loglabprojetos.com.br" || true

    echo "Configurando overwrite..."
    occ config:system:set overwriteprotocol --value="https" || true
    occ config:system:set overwritehost --value="intranet.loglabprojetos.com.br" || true
    occ config:system:set overwrite.cli.url --value="https://intranet.loglabprojetos.com.br" || true

    echo "Configurando trusted proxies..."
    occ config:system:set trusted_proxies 0 --value="10.10.100.35" || true
    occ config:system:set trusted_proxies 1 --value="10.10.100.30" || true
    occ config:system:set trusted_proxies 2 --value="10.0.0.0/8" || true
    occ config:system:set trusted_proxies 3 --value="172.16.0.0/12" || true
    occ config:system:set trusted_proxies 4 --value="192.168.0.0/16" || true

    echo "Configurando SSO Loglab..."
    occ config:system:set loglab_auth_login_url --value="https://infra.loglabprojetos.com.br/microsservices/auth/login" || true

    echo "Configurações recomendadas..."
    occ config:system:set default_phone_region --value="BR" || true
    occ config:system:set maintenance_window_start --value="1" || true

    echo "Configurando CSP customizado..."
    occ config:system:set custom_csp_policy --value="script-src 'self' 'unsafe-inline' 'unsafe-eval' https://intranet.loglabprojetos.com.br; style-src 'self' 'unsafe-inline' https://intranet.loglabprojetos.com.br; img-src * data: blob:;" || true

    echo "Ativando tema Loglab..."
    occ app:enable loglab_theme || true

    echo "Apps Loglab instalados:"
    occ app:list | grep loglab || true

else
    echo "config.php não encontrado."
fi

echo "Nextcloud configurado."

wait $APACHE_PID