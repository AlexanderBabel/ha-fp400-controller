FROM ghcr.io/matter-js/matterjs-server:1.6.0@sha256:9eb98c839d0b4b07f9230b96ad52de570f7f2a7c286c5992b4c04b6b26c08a3f
# Supervisor's /data is root-owned.
USER 0:0
COPY server /opt/fp400/server
ENV STORAGE_PATH=/data/matter
ENV PORT=5581
ENV LISTEN_ADDRESS=127.0.0.1
# 0xFFF1: the FP400 (firmware < 1.2.0.6) refuses its vendor clusters from HA's 0x134B fabric.
ENV VENDOR_ID=65521
ENV FABRIC_ID=400
ENV DISABLE_OTA=true
ENV DISABLE_DASHBOARD=true
ENV MATTER_LOG_FORMAT=plain
ENV LOG_LEVEL=warning
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --start-interval=5s --retries=3 CMD ["node", "/opt/fp400/server/health.mjs"]
ENTRYPOINT ["node", "/opt/fp400/server/launch.mjs"]
CMD []
