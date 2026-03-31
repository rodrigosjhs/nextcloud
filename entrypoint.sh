#!/bin/bash
set -e

CONFIG_FILE="/var/www/html/config/config.php"

occ() {
    su -s /bin/bash www-data -c "php /var/www/html/occ $*"
}

echo "Aguardando config.php..."

for i in {1..120}; do
    if [ -f "$CONFIG_FILE" ]; then
        echo "Nextcloud detectado."
        break
    fi
    sleep 2
done

echo "Aguardando Redis..."

until nc -z redis.hpb.svc.cluster.local 6379; do
    sleep 2
done

# if [ -f "$CONFIG_FILE" ]; then

#     occ config:system:set trusted_domains 0 --value="localhost" || true
#     occ config:system:set trusted_domains 1 --value="intranet.loglabprojetos.com.br" || true

#     occ config:system:set overwriteprotocol --value="https" || true
#     occ config:system:set overwritehost --value="intranet.loglabprojetos.com.br" || true
#     occ config:system:set overwrite.cli.url --value="https://intranet.loglabprojetos.com.br" || true

#     occ config:system:set trusted_proxies 0 --value="10.10.100.35" || true
#     occ config:system:set trusted_proxies 1 --value="10.10.100.30" || true
#     occ config:system:set trusted_proxies 2 --value="10.0.0.0/8" || true
#     occ config:system:set trusted_proxies 3 --value="172.16.0.0/12" || true
#     occ config:system:set trusted_proxies 4 --value="192.168.0.0/16" || true

#     occ config:system:set loglab_auth_login_url --value="https://infra.loglabprojetos.com.br/microsservices/auth/login" || true

#     occ config:system:set memcache.local --value="\\OC\\Memcache\\APCu" || true
#     occ config:system:set memcache.locking --value="\\OC\\Memcache\\Redis" || true
#     occ config:system:set memcache.distributed --value="\\OC\\Memcache\\Redis" || true

#     occ config:system:set redis host --value="redis.hpb.svc.cluster.local" || true
#     occ config:system:set redis port --value="6379" --type=integer || true
#     occ config:system:set redis timeout --value="1.5" --type=float || true

#     occ app:enable loglab_theme || true

# fi

echo "Iniciando Apache..."
exec apache2-foreground