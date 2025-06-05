// test_api_projects.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ]
};

export default function() {
  const baseUrl = 'https://api.raimundoserver.lat';
  
  // Endpoint para obtener la lista de proyectos
  const response = http.get(`${baseUrl}/projects`);
  
  check(response, {
    'status 200': (r) => r.status === 200,
    'tiempo de respuesta < 300ms': (r) => r.timings.duration < 300,
    'formato JSON correcto': (r) => {
      try {
        const json = JSON.parse(r.body);
        return Array.isArray(json);
      } catch (e) {
        console.log(`Error al parsear JSON: ${e.message}`);
        return false;
      }
    }
  });
  
  sleep(Math.random() * 3 + 2);
}

export function handleSummary(data) {
  const resultsSummary = {
    testInfo: {
      testName: "Prueba de carga API - Proyectos",
      timestamp: new Date().toISOString(),
      testDuration: data.state.testRunDurationMs / 1000,
      vusMax: options.stages.reduce((max, stage) => Math.max(max, stage.target), 0),
    },
    metrics: {
      http: {
        requestsTotal: data.metrics.http_reqs.values.count,
        requestsPerSecond: data.metrics.http_reqs.values.rate,
        failedRequests: data.metrics.http_req_failed.values.passes,
        failureRate: data.metrics.http_req_failed.values.rate * 100,
        duration: {
          avg: data.metrics.http_req_duration.values.avg,
          min: data.metrics.http_req_duration.values.min,
          med: data.metrics.http_req_duration.values.med,
          max: data.metrics.http_req_duration.values.max,
          p90: data.metrics.http_req_duration.values["p(90)"],
          p95: data.metrics.http_req_duration.values["p(95)"]
        }
      },
      checks: {
        total: data.metrics.checks.values.count,
        passes: data.metrics.checks.values.passes,
        failures: data.metrics.checks.values.fails,
        passRate: (data.metrics.checks.values.rate * 100).toFixed(2) + "%"
      },
      iterations: {
        total: data.metrics.iterations.values.count,
        perSecond: data.metrics.iterations.values.rate,
        avgDuration: data.metrics.iteration_duration.values.avg
      },
      network: {
        dataReceived: {
          total: data.metrics.data_received.values.count,
          rate: data.metrics.data_received.values.rate
        },
        dataSent: {
          total: data.metrics.data_sent.values.count,
          rate: data.metrics.data_sent.values.rate
        }
      }
    },
    checkResults: {},
    stages: options.stages
  };

  // Añadir los resultados de cada check individual
  Object.keys(data.metrics).forEach(metricName => {
    if (metricName.startsWith('check{')) {
      const checkName = metricName.match(/check{script, name:(.*?)}/)[1].trim();
      resultsSummary.checkResults[checkName] = {
        passes: data.metrics[metricName].values.passes,
        fails: data.metrics[metricName].values.fails,
        passRate: (data.metrics[metricName].values.rate * 100).toFixed(2) + "%"
      };
    }
  });

  return {
    "resultados_carga_api_projects.json": JSON.stringify(resultsSummary, null, 2),
  };
}