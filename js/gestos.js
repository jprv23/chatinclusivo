let video;
let handposeModel;
let classifier;
let isModelLoaded = false;

async function setupCamera() {
  video = document.getElementById('video');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true
    });
    video.srcObject = stream;
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        resolve(video);
      };
    });
  } catch (error) {
    alert(error.message);
  }
}

async function loadModel() {
  handposeModel = await handpose.load();
  classifier = knnClassifier.create();
  isModelLoaded = true;
  loadModelFromTxt();
  detectHands();

}

let loading = false;
let delaySeconds = 3;
let palabras_permitidas = [
  "hola",
  "donde encuentro el bus",
  "a la universidad",
  "muchas gracias",
  "hasta luego",
];

async function detectHands() {
  if (!isModelLoaded || !video) return;

  const predictions = await handposeModel.estimateHands(video);
  const output = document.getElementById('output');

  if (predictions.length > 0 && predictions[0].landmarks && predictions[0].landmarks.length === 21) {    
    const landmarks = predictions[0].landmarks.flat();
    const tensor = tf.tensor2d([landmarks]);

    if (classifier.getNumClasses() > 0) {
      try {
        const prediction = await classifier.predictClass(tensor);

        if (prediction.confidences[prediction.label] > 0.8 && prediction.label !== 'none') {
          if (output) output.innerText = `Detectado: ${prediction.label}`;

          if (!loading && palabras_permitidas.includes(prediction.label)) {
            loading = true;

            let is_repeat = false;
            let is_ok_add_message = true;
            let words = [];
            let words_recived = [];
            document.querySelectorAll('.message.sent').forEach(function(item) {
              let texto = parsearMensaje(item.textContent);
              words.push(texto);
              if(texto == prediction.label){
                is_repeat = true;
              }
            });

            document.querySelectorAll('.message.received').forEach(function(item) {
              let texto = parsearMensaje(item.textContent);
              words_recived.push(texto)
            });
            
            if(!is_repeat && words_recived.length > 0){

              if(prediction.label == "hola" && words.length != 0){
                is_ok_add_message = false;
              }

              if(prediction.label == "donde encuentro el bus" && words.length != 1){
                is_ok_add_message = false;
              }

              if(prediction.label == "a la universidad" && words.length != 2){
                is_ok_add_message = false;
              }

              if(prediction.label == "muchas gracias" && words.length != 3){
                is_ok_add_message = false;
              }

              if(prediction.label == "hasta luego" && words.length != 4){
                is_ok_add_message = false;
              }

              if(is_ok_add_message){
                if(prediction.label == "hola"){
                  prediction.label = "Hola!";
                }else if(prediction.label == "donde encuentro el bus"){
                  prediction.label = "¿Dónde encuentro el bus";
                }else if(prediction.label == "a la universidad"){
                  prediction.label = "a la Universidad?";
                }else if(prediction.label == "muchas gracias"){
                  prediction.label = "Muchas gracias!";
                }else if(prediction.label == "hasta luego"){
                  prediction.label = "Hasta luego!";
                }

                addMessage(prediction.label);
              }
            }
            
            setTimeout(() => {
              loading = false;
            }, delaySeconds * 1000)
          }
        }
      } catch (error) {
        console.error("Error en la predicción:", error);
      }
    }
  } else {
    if (output) output.innerText = "Esperando gesto...";
  }

  requestAnimationFrame(detectHands);
}

function addExample(label) {
  if (!isModelLoaded) return;
  handposeModel.estimateHands(video).then(predictions => {
    if (predictions.length > 0) {
      const landmarks = predictions[0].landmarks.flat();
      const tensor = tf.tensor2d([landmarks]);
      classifier.addExample(tensor, label);
      updateExampleList();
    }
  }).catch(error => {
    console.error("Error al capturar gesto:", error);
  });
}

function updateExampleList() {
  const list = document.getElementById('exampleList');
  if (!list || !classifier.getClassExampleCount) return;

  const counts = classifier.getClassExampleCount();
  list.innerHTML = '';
  for (const label in counts) {
    const li = document.createElement('li');
    li.innerText = `${label}: ${counts[label]} ejemplo(s)`;
    list.appendChild(li);
  }
}

function saveModelAsTxt() {
  const dataset = classifier.getClassifierDataset();
  const json = {};

  Object.keys(dataset).forEach(label => {
    const data = dataset[label].dataSync();
    const shape = dataset[label].shape;
    json[label] = {
      data: Array.from(data),
      shape
    };
  });

  const blob = new Blob([JSON.stringify(json)], {
    type: 'text/plain'
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modelo_gestos.txt';
  a.click();
}

function loadModelFromTxtOld() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt';

  input.onchange = function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json = JSON.parse(e.target.result);
        const dataset = {};

        Object.keys(json).forEach(label => {
          const entry = json[label];
          if (entry && Array.isArray(entry.data) && Array.isArray(entry.shape)) {
            dataset[label] = tf.tensor(entry.data, entry.shape);
          } else {
            console.warn(`Formato inválido para la clase: ${label}`);
          }
        });

        classifier.setClassifierDataset(dataset);
        alert("Modelo cargado correctamente.");
        updateExampleList();
      } catch (err) {
        console.error("Error al cargar el modelo:", err);
        alert("El archivo no tiene el formato esperado.");
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

function loadModelFromTxt() {
  fetch('storage/modelo.txt') // Ruta relativa al archivo .txt en tu proyecto
    .then(response => {
      if (!response.ok) throw new Error('No se pudo cargar el archivo');
      return response.text();
    })
    .then(text => {
      try {
        const json = JSON.parse(text);
        const dataset = {};

        Object.keys(json).forEach(label => {
          const entry = json[label];
          if (entry && Array.isArray(entry.data) && Array.isArray(entry.shape)) {
            dataset[label] = tf.tensor(entry.data, entry.shape);
          } else {
            console.warn(`Formato inválido para la clase: ${label}`);
          }
        });

        classifier.setClassifierDataset(dataset);
        document.getElementById('loading').style.display = 'none';
        updateExampleList();
      } catch (err) {
        console.error("Error al analizar el modelo:", err);
        alert("El archivo no tiene el formato esperado.");
      }
    })
    .catch(err => {
      console.error("Error al cargar el archivo:", err);
      alert("No se pudo cargar el archivo de modelo.");
    });
}

setupCamera().then(loadModel);