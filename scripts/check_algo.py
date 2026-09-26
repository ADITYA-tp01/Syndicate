from falkordb import FalkorDB

db = FalkorDB(host='localhost', port=6379)
g = db.select_graph('test')

# Test WCC
res = g.query('CALL algo.WCC()')
print('WCC result count:', len(res.result_set))
print('First few:', res.result_set[:3])

# Test PageRank
try:
    res = g.query('CALL algo.pageRank("Person", "TRANSFERRED_TO")')
    print('PageRank result count:', len(res.result_set))
    print('First few:', res.result_set[:3])
except Exception as e:
    print('PageRank error:', e)

# Test labelPropagation
try:
    res = g.query('CALL algo.labelPropagation("Person", "TRANSFERRED_TO")')
    print('LabelPropagation result count:', len(res.result_set))
    print('First few:', res.result_set[:3])
except Exception as e:
    print('LabelPropagation error:', e)