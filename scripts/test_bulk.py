import time
from falkordb import FalkorDB

db = FalkorDB(host='localhost', port=6379)
g = db.select_graph('perf_test')

# Test bulk insert with UNWIND
start = time.time()
queries = []
for i in range(500):
    queries.append(f'CREATE (:PerfTest {{id: {i}, value: "test{i}"}})')

# Batch them
batch = 50
for i in range(0, len(queries), batch):
    batch_queries = queries[i:i+batch]
    combined = ' '.join(batch_queries)
    g.query(combined)

elapsed = time.time() - start
print(f'500 nodes in {elapsed:.2f}s = {500/elapsed:.0f} nodes/sec')