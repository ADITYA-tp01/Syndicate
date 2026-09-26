from falkordb import FalkorDB

db = FalkorDB(host='localhost', port=6379)
g = db.select_graph('test')
res = g.query('CALL dbms.procedures()')
print('Procedures:')
for row in res.result_set:
    print(row)