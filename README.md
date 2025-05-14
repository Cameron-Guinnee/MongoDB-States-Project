# INF 653 FINAL PROJECT

Deployed to Glitch at:
https://cut-silk-phalange.glitch.me

## GET Requests
| Route    | Description |
| -------- | ---------- |
| /states/ | Returns json data of all states as well as funfacts, if any, from MongoDB.
| /states/?contig=false | Only non-contiguous states. |
| /states/KS | json of just the state. |
| states/KS/funfact | A random fun fact of the state. |
| states/KS/capital | State capital. |
| states/KS/population | State population. |
| states/KS/nickname | State nickname. |
| states/KS/admission | Admission date of the state. |

## POST Request
| Route   | Description |
| ------- | ----------- |
| /states/KS/funfact | User funfact array is added to the DB funfacts array.|


## PATCH Request
| Route   | Description |
| ------- | ----------- |
| /states/KS/funfact | User-provided funfact replaces funfact at the user-provided index. | 

## DELETE Request 
| Route   | Description |
| ------- | ----------- |
| /states/KS/funfact | Fun fact deleted at user-provided index. |
