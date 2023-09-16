import React from 'react';
import './App.css';
import FileUpload from './controller/FileUpload';

function App() {
  return (
    <div className="App">
      <h1>Atualização de Preços</h1>
      <FileUpload />
    </div>
  );
}
console.warn = function () {};
console.error = function () {};


export default App;