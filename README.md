# NEWBASE

Plataforma automatitzada d'intermediació i descoberta d'oportunitats entre plataformes i mercats d'Àsia, Espanya, Europa i la resta del món.

## Principis obligatoris

- Cost operatiu objectiu: 0 €.
- 0 càrrecs.
- 0 subscripcions.
- 0 afiliació.
- Automatització màxima.
- Català i castellà com a idiomes base; altres idiomes segons mercat.
- Respecte de la legislació i dels termes de cada país i plataforma.
- No scraping quan una font oficial, API, feed o mecanisme autoritzat sigui necessari o preferible.
- No contacte humà rutinari. Intervenció només davant oportunitats de negoci rellevants o riscos que justifiquin perdre automatització.

## Funció

NEWBASE detecta dades i oportunitats disponibles legalment, les normalitza, aplica regles de legalitat i qualitat, compara informació entre mercats i prepara resultats accionables.

El sistema no assumeix que una plataforma ofereix una API. Cada connector s'ha de validar abans d'activar-se.

## Arquitectura inicial

- `config/`: fonts i configuració.
- `connectors/`: integracions amb fonts externes.
- `engine/`: normalització, puntuació i control legal.
- `data/`: esquemes de dades.
- `monitor/`: procés d'observació automatitzada.
- `web/`: futura interfície pública.

## Estat

Fase 1: base tècnica inicial creada. El següent treball és validar fonts i connectors reals, començant per fonts amb accés públic o mecanismes oficials gratuïts.
