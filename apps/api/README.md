
Design logic:
Define contracts first with zod 
    Write zod schemas for inputs and outputs:
    What the user(client) want to do, and what do the promise need to send back

Validate at the boundary
    the first code that sees the inbound data should verify it
    validateBody/validateQuery middles

Keep handlers thin (routes)
    a few lines
    only orchestrate, not implement
    later move into services and repositories


Note:
1. Use clear HTTP semantics:
   1. Async use 202 accepted
   2. Sync creation use 201 created with a location header
   3. Failed validation use 400 Bad Request with a consistent error body (specified in validation)

2. use version for api versioning

3. predicable envelope for lists
   1. Make UI easier to understand how to render and paginate
   2. Never return a raw array from list points

Test:
Sept 22
Bad request: curl -i "http://localhost:3000/v1/search?tenantId=&q="
Search: curl -s "http://localhost:3000/v1/search?tenantId=t1&q=hello" | jq .
Create doc:
curl -s -X POST "http://localhost:3000/v1/documents" \
  -H "content-type: application/json" \
  -d '{"tenantId":"t1","title":"My Doc","source":"upload"}' 

