// PanelTemplate.js
import React, { useState, useEffect } from "react";

const VariableSelector = ({ variables, onSelect }) => (
  <div
    style={{
      position: "absolute",
      backgroundColor: "white",
      border: "1px solid #ccc",
      marginTop: "2px",
    }}
  >
    {variables.map((variable, index) => (
      <div
        key={index}
        onClick={() =>
          onSelect(variable.nodeLabel + "_" + variable.variableName)
        }
        style={{ padding: "5px", cursor: "pointer" }}
      ></div>
    ))}
  </div>
);

const RenderInputElement = (
  index,
  element,
  handleChange,
  variables,
  showVariableSelector,
  setShowVariableSelector,
  baseElements
) => {
  const { type, name, value, elementList } = element;
  const newListElement = () => {
    return JSON.parse(JSON.stringify(elementList));
  };

  if (type === "text" || type === "int") {
    const handleKeyUp = (e) => {
      const value = e.target.value;
      if (value[value.length - 1] === "/") {
        setShowVariableSelector(prev => {
            prev[index] = true;
            return prev;
        });
      } else {
        setShowVariableSelector(prev => {
            prev[index] = false;
            return prev;
        });
      }
    };

    const handleSelectVariable = (variable) => {
      const newValue = value.slice(0, -1) + `<var>${variable}</var> `;
      handleChange(index, newValue);
      setShowVariableSelector(prev => {
            prev[index] = false;
            return prev;
        });
    };
    return (
      <div>
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyUp={handleKeyUp}
        />
        {showVariableSelector[index] && (
          <VariableSelector
            variables={variables}
            onSelect={handleSelectVariable}
          />
        )}
      </div>
    );
  } else if (type === "enum") {
    if (value === "" || value.length === 0) handleChange(index, 0);
    return (
      <select
        name={name}
        value={parseInt(value, 10)}
        onChange={(e) => handleChange(index, parseInt(e.target.value, 10))}
      >
        <option value={-1} disabled>
          请选择
        </option>
        {elementList.map((option, optionIndex) => (
          <option key={option} value={optionIndex}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (type === "stringEnum") {
    return (
      <select
        name={name}
        value={value}
        onChange={(e) => handleChange(index, e.target.value)}
      >
        <option value={""} disabled>
          请选择
        </option>
        {elementList.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  } else if (type === "bool") {
    return (
      <input
        type="checkbox"
        name={name}
        checked={value}
        onChange={(e) => handleChange(index, e.target.checked)}
      />
    );
  } else if (type === "editableList") {
    if (value.length === 0) {
      value.push(newListElement());
    }

    return (
      <div>
        {value.map((listItem, listIndex) => (
          // <div style={{ display: 'flex' }}>
          <div>
            {listItem.map((itemElement, itemIndex) => (
              <div>
                <label>{itemElement.name}</label>
                {RenderInputElement(
                  itemIndex,
                  itemElement,
                  (_, valueChild) => {
                    itemElement.value = valueChild;
                    handleChange(index, value);
                  },
                  variables,
                  showVariableSelector,
                  setShowVariableSelector,
                  listItem
                )}
              </div>
            ))}
            {listIndex > 0 && (
              <button
                onClick={() => {
                  const newListValue = [...value];
                  newListValue.splice(listIndex, 1);
                  handleChange(index, newListValue);
                }}
              >
                {" "}
                Delete{" "}
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => {
            const newListValue = [...value, newListElement()];
            handleChange(index, newListValue);
          }}
        >
          {" "}
          Add{" "}
        </button>
      </div>
    );
  } else if (type === "constrainedList") {
    if (value.length === 0) {
      value.push(newListElement());
    }

    let selectedToolValueIndex = -1;
    const selectedToolElement = baseElements.find(
      (el) => el.name === element.constrain
    );

    if (selectedToolElement) {
      const selectedValue = selectedToolElement.value;
      selectedToolValueIndex =
        selectedToolElement.elementList.indexOf(selectedValue);
    }

    if (element.constrainIndex != selectedToolValueIndex) {
      element.constrainIndex = selectedToolValueIndex;
      value.pop();
      value.push(newListElement()[selectedToolValueIndex]);
    }

    return (
      <div>
        {value.map((listItem) => (
          <div>
            {listItem.map((itemElement, itemIndex) => (
              <div>
                <label>{itemElement.name}</label>
                {RenderInputElement(
                  itemIndex,
                  itemElement,
                  (_, valueChild) => {
                    itemElement.value = valueChild;
                    handleChange(index, value);
                  },
                  variables,
                  showVariableSelector,
                  setShowVariableSelector,
                  listItem
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
};

const PanelTemplate = ({
  NodeTypeName,
  dynamicElements,
  onParamsChange,
  variables,
}) => {
  const [elements, setElements] = useState(
    dynamicElements.map((el, index) => ({
      ...el,
      id: index,
    }))
  );

  const [showVariableSelector, setShowVariableSelector] = useState(false);

  useEffect(() => {
    setElements(dynamicElements);
  }, [JSON.stringify(dynamicElements)]);

  const handleChange = (index, value) => {
    const updatedElements = elements.map((el, idx) =>
      idx === index ? { ...el, value: value } : el
    );
    onParamsChange(updatedElements);
  };

  const renderElements = () =>
    elements.map((element, index) => (
      <div key={index}>
        <label>{element.name}</label>
        {RenderInputElement(
          index,
          element,
          handleChange,
          variables,
          showVariableSelector,
          setShowVariableSelector,
          elements
        )}
      </div>
    ));

  return (
    <div>
      <h3
        style={{
          position: "absolute",
          top: "10px",
          left: "20px",
          margin: "5px",
        }}
      >
        {NodeTypeName}
      </h3>
      <div
        style={{
          position: "absolute",
          top: "80px",
          left: "20px",
        }}
      >
        {renderElements()}
      </div>
    </div>
  );
};

export default PanelTemplate;
