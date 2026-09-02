# OPVILO Clean

Nova base d'OPVILO creada des de zero, sense reutilitzar el codi de l'anterior aplicació.

## Objectiu
- Interfície clara i responsive.
- Rutes principals d'OPVILO.
- OPVILO IA amb endpoint `/api/ai`.
- Multilingüe sense banderes.
- Validació i gestió d'errors.
- Preparat per Cloudflare Workers + Workers AI.

## Desenvolupament

`npm run check`

El Worker necessita el binding `AI` de Cloudflare Workers AI per activar la resposta generativa.
