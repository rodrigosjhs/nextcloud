#!/bin/bash
set -e

apache2-foreground &

echo "Aguardando Nextcloud iniciar..."
sleep 20

if [ -f /var/www/html/config/config.php ]; then

    echo "Configurando trusted domains..."

    sudo -u www-data php occ config:system:set trusted_domains 0 --value="localhost" || true
    sudo -u www-data php occ config:system:set trusted_domains 1 --value="cloud.seudominio.com" || true

    echo "Ativando tema Loglab..."

    sudo -u www-data php occ app:enable loglab_theme || true

    echo "Apps instalados:"
    sudo -u www-data php occ app:list | grep loglab || true

fi

wait