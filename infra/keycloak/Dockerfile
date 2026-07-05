FROM quay.io/keycloak/keycloak:25.0

ENV KC_DB=postgres
ENV KC_CACHE=local
ENV JAVA_OPTS_KC_HEAP="-XX:InitialRAMPercentage=25 -XX:MaxRAMPercentage=50"

COPY realm-export.json /opt/keycloak/data/import/realm-export.json

RUN /opt/keycloak/bin/kc.sh build

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized", "--import-realm", "--http-enabled=true", "--hostname-strict=false", "--proxy-headers=xforwarded"]
