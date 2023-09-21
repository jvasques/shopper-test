import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import '../App.css';

function FileUpload() {
  const [csvData, setCsvData] = useState([]);
  const [hasValidHeaders, setHasValidHeaders] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isButtonEnabled, setIsButtonEnabled] = useState(false);
  const [isUpdateButtonEnabled, setIsUpdateButtonEnabled] = useState(false);
  const [updatedPrices, setUpdatedPrices] = useState([]);
  const [updatedCode, setUpdatedCode] = useState([]);
  const [productValidationStatus, setProductValidationStatus] = useState([]);

  const checkProductExistence = async (productCode) => {
    try {
      const response = await fetch(`http://localhost:3001/search-product/${productCode}`);
      if (response.status === 200) {
        const productData = await response.json();
        return productData;
      } else {
        return null; // Produto não encontrado
      }
    } catch (error) {
      console.error('Erro ao buscar informações do produto:', error);
      return null;
    }
  };

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];

    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const headers = result.meta.fields;
          if (headers.includes('product_code') && headers.includes('new_price')) {
            setHasValidHeaders(true);
            setCsvData(result.data);
          } else {
            setHasValidHeaders(false);
            setCsvData([]);
            alert('Por favor, envie um arquivo CSV com os campos "product_code" e "new_price".');
          }
        },
        error: (error) => {
          console.error('Erro ao analisar o arquivo CSV:', error.message);
        },
      });
    }
  };

  useEffect(() => {
    if (csvData.length > 0) {
      const isValid = csvData.every((row) => {
        const newPrice = parseFloat(row.new_price);
        return !isNaN(newPrice);
      });

      setIsButtonEnabled(isValid);
      setIsUpdateButtonEnabled(false);

      const nonExistentProducts = [];
      const validProductPromises = [];

      csvData.forEach((row) => {
        const productCode = row.product_code;
        const promise = checkProductExistence(productCode);

        promise.then((productData) => {
          if (productData === null) {
            nonExistentProducts.push(productCode);
          } else {
            validProductPromises.push(promise);
          }
        });

        validProductPromises.push(promise);
      });

      Promise.all(validProductPromises)
        .then((productData) => {
          // Se houver produtos não cadastrados, atualize o estado de validação para eles.
          csvData.forEach((row, index) => {
            const productCode = row.product_code;
            if (nonExistentProducts.includes(productCode)) {
              setProductValidationStatus((prevState) => {
                prevState[index] = false;
                return [...prevState];
              });
            }
          });

          // Continuar com os produtos válidos
          const validProductData = productData.filter((data) => data !== null);
          setSelectedProducts(validProductData);
          setProductValidationStatus(Array(validProductData.length).fill(false));
        });
    }
  }, [csvData]);

  const handleValidationButtonClick = () => {
    const updatedProducts = selectedProducts.map((product, index) => {
      const currentPrice = parseFloat(product.sales_price);
      const newPrice = parseFloat(csvData[index].new_price);
      const costPrice = parseFloat(product.cost_price);

      if (isNaN(newPrice)) {
        setProductValidationStatus((prevState) => {
          prevState[index] = false;
          return [...prevState];
        });
        return { ...product, validationMessage: 'Novo preço inválido.' };
      }

      if (newPrice < costPrice) {
        setProductValidationStatus((prevState) => {
          prevState[index] = false;
          return [...prevState];
        });
        return { ...product, validationMessage: `Novo preço não pode ser menor que o preço de custo. (${product.cost_price})` };
      }

      if (newPrice < currentPrice * 0.9 ) {
        setProductValidationStatus((prevState) => {
          prevState[index] = false;
          return [...prevState];
        });
        return { ...product, validationMessage: 'Novo preço não pode ser menor que 10%.' };
      }

      if (newPrice > currentPrice * 1.1) {
        setProductValidationStatus((prevState) => {
          prevState[index] = false;
          return [...prevState];
        });
        return { ...product, validationMessage: 'Novo preço não pode ser maior do que 10%.' };
      }

     // Se a validação passar, defina o status de validação para true
     setProductValidationStatus((prevState) => {
      prevState[index] = true;
      return [...prevState];
    });
    return { ...product, validationMessage: 'Validado com sucesso.' };
  });

  setSelectedProducts(updatedProducts);

  const updatedPrices = updatedProducts.map((product, index) => {
    if (product.validationMessage === 'Validado com sucesso.') {
      return parseFloat(csvData[index].new_price);
    } else {
      return parseFloat(product.sales_price);
    }
  });

  const updatedCode = updatedProducts.map((product, index) => {
    if (product.validationMessage === 'Validado com sucesso.') {
      return parseFloat(csvData[index].product_code);
    } else {
      return parseFloat(product.code);
    }
  });

  setUpdatedPrices(updatedPrices);
  setUpdatedCode(updatedCode);

  const hasPassedValidation = updatedProducts.some((product) => product.validationMessage === 'Validado com sucesso.');

  setIsUpdateButtonEnabled(hasPassedValidation); // Habilitar o botão se pelo menos um item passar na validação
};

const handleUpdateButtonClick = () => {
  const productsToUpdate = selectedProducts.filter((product, index) => productValidationStatus[index] === true);
  const updateData = productsToUpdate.map((selectedProduct) => {
    return {
      productCode: updatedCode[selectedProducts.indexOf(selectedProduct)],
      newPrice: updatedPrices[selectedProducts.indexOf(selectedProduct)],
    };
  });

  fetch('http://localhost:3001/update-prices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        alert('Preços atualizados com sucesso!');
      } else {
        alert('Erro ao atualizar preços.');
        console.log(data);
      }
    })
    .catch((error) => {
      console.error('Erro ao atualizar preços:', error);
      alert('Erro ao atualizar preços.');
    });
};

const { getRootProps, getInputProps } = useDropzone({
  onDrop,
  accept: '.csv',
});

console.log('botão ativo?', isUpdateButtonEnabled)

return (
  <div>
    <div {...getRootProps()} style={{ border: '1px dashed black', padding: '20px' }}>
      <input {...getInputProps()} />
      <p>Arraste e solte o arquivo .csv aqui ou clique para selecionar um arquivo.</p>
    </div>
    {hasValidHeaders ? (
      <div>
        {selectedProducts.length > 0 && (
          <div>
            <h2>Informações dos Produtos A Serem Atualizados:</h2>
            <table>
              <thead>
                <tr>
                  <th>Nome do Produto</th>
                  <th>Preço de Venda Atual</th>
                  <th>Novo Preço</th>
                  <th>Validação</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((product, index) => (
                  <tr key={index}>
                    <td>{product.name}</td>
                    <td>{product.sales_price}</td>
                    <td>{csvData[index].new_price || 'N/A'}</td>
                    <td>{product.validationMessage || 'Aguardando validação'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <br />
            <button onClick={handleValidationButtonClick} disabled={!isButtonEnabled}>
              VALIDAR
            </button>
            <button onClick={handleUpdateButtonClick} disabled={!isUpdateButtonEnabled}>
              ATUALIZAR
            </button>
          </div>
        )}
      </div>
    ) : null}
  </div>
);
}

export default FileUpload;