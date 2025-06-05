// test_api_project_detail.js
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Rampa hasta 5 usuarios en 30 segundos
    { duration: '1m', target: 5 },     // Mantener 5 usuarios por 1 minuto
    { duration: '30s', target: 10 },   // Rampa hasta 10 usuarios en 30 segundos (simulando pico)
    { duration: '1m', target: 10 },    // Mantener pico de 10 usuarios por 1 minuto
    { duration: '30s', target: 0 },    // Rampa hacia abajo en 30 segundos
  ]
};

export default function() {
  const baseUrl = 'https://api.raimundoserver.lat';
  const projectId = 2; // ID del proyecto a consultar
  
  // Endpoint: Obtener detalles de un proyecto específico
  const response = http.get(`${baseUrl}/projects/${projectId}`);
  
  // Depuración - Ver las primeras líneas de la respuesta
  console.log(`Status: ${response.status}`);
  console.log(`Body (primeros 100 caracteres): ${response.body.substring(0, 100)}...`);
  
  check(response, {
    'status 200': (r) => r.status === 200,
    'tiempo de respuesta < 300ms': (r) => r.timings.duration < 300,
    'respuesta no vacía': (r) => r.body.length > 0,
    'formato correcto': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json && typeof json === 'object';
      } catch (e) {
        console.log(`Error al parsear JSON: ${e.message}`);
        return false;
      }
    },
    'contiene id del proyecto': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json && json.id !== undefined;
      } catch (e) {
        return false;
      }
    },
    'contiene nombre del proyecto': (r) => {
      try {
        const json = JSON.parse(r.body);
        return json && json.name !== undefined;
      } catch (e) {
        return false;
      }
    }
  });
  
  // Tiempo entre acciones de usuario (más realista)
  sleep(Math.random() * 3 + 2); // Entre 2-5 segundos
}

// Función para generar el archivo JSON con los resultados
export function handleSummary(data) {
  const resultsSummary = {
    testInfo: {
      testName: "Prueba de carga API - Detalle de Proyecto",
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
    "resultados_carga_api_project_detail.json": JSON.stringify(resultsSummary, null, 2),
  };
}