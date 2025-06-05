// test.js para equipo pequeño interno
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  // Configuración para equipo pequeño interno (5-10 personas)
  stages: [
    { duration: '30s', target: 5 },    // Rampa hasta 5 usuarios en 30 segundos
    { duration: '1m', target: 5 },     // Mantener 5 usuarios por 1 minuto
    { duration: '30s', target: 10 },   // Rampa hasta 10 usuarios en 30 segundos (simulando pico)
    { duration: '1m', target: 10 },    // Mantener pico de 10 usuarios por 1 minuto
    { duration: '30s', target: 0 },    // Rampa hacia abajo
  ]
};

export default function() {
  // Reemplaza esta URL con la de tu aplicación interna
  const response = http.get('https://ensoil.netlify.app/excels');
  
  // Añade comprobaciones para verificar respuestas correctas
  check(response, {
    'status 200': (r) => r.status === 200,
    'tiempo de respuesta < 300ms': (r) => r.timings.duration < 300,
  });
  
  // Tiempo entre acciones de usuario
  sleep(Math.random() * 3 + 2); // Entre 2-5 segundos (más realista que 1 segundo fijo)
}

// Función para generar el archivo JSON con los resultados
export function handleSummary(data) {
  // Crear un objeto con los datos más relevantes
  const resultsSummary = {
    testInfo: {
      testName: "Prueba de carga para equipo interno pequeño",
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
    "resultados_carga.json": JSON.stringify(resultsSummary, null, 2),
  };
}