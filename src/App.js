//App.js
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { addEdge, useNodesState, useEdgesState } from 'reactflow';

import './App.css';
import CustomNode from './CustomNode'
import Sidebar from './Sidebar';
import PanelTemplate from './PanelTemplate';
import 'react-flow-renderer/dist/style.css';
import 'react-flow-renderer/dist/theme-default.css';

export default function App() {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [workFlowName, setWorkFlowName] = useState('new workflow');
  const [nodeConfigs, setnodeConfigs] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeTypes, setNodeTypes] = useState({});
  let triggerId = 0;
  const TriggerNodes = ['UserInputNode'];

  const updateConfigs = (newConfigs) => {
    setnodeConfigs(newConfigs);
  };

  useEffect(() => {
    window.updateNodeConfigs = updateConfigs;
  }, []);

  const findNodeConfig = (nodeTypeName, configs) => {
    return configs.find(config => config.NodeTypeName === nodeTypeName);
  };

  const updateFlowFromJSON = async (workflowJson) => {
    const { name, TriggerNode, OperationNodes, Connections } = workflowJson;
    triggerId = TriggerNode.id;
    setWorkFlowName(name);
    const processDynamicElements = (elements, sourceData) => {
      return elements.map(element => {
        if (["editableList", "constrainedList"].includes(element.type)) {
          return {
            ...element,
            value: sourceData[element.name] ? sourceData[element.name].map(item => processDynamicElements(element.elementList, item)) : []
          };
        } else {
          const value = sourceData[element.name];
          return {
            ...element,
            value: value !== undefined ? value : element.value
          };
        }
      });
    };

    const createNode = (nodeData) => {
      const nodeConfig = findNodeConfig(nodeData.NodeTypeName, nodeConfigs);

      return {
        id: nodeData.Id,
        type: nodeData.NodeTypeName,
        typeDetail: nodeData.Type,
        OutputVariable: nodeConfig?.OutputVariable || [],
        dynamicElements: processDynamicElements(JSON.parse(JSON.stringify(nodeConfig?.dynamicElements || [])), nodeData),
        data: {
          label: nodeData.CustomName,
          InputPortsCount: nodeConfig.InputPortsCount,
          OutputPortsCount: nodeConfig.OutputPortsCount,
        },
        position: { x: nodeData.nodePosX, y: nodeData.nodePosY }
      };
    };

    const processedNodes = [
      ...(Object.keys(TriggerNode).length !== 0 ? [createNode(TriggerNode)] : []),
      ...OperationNodes.map(node => createNode(node))
    ];

    setNodes(processedNodes);

    setEdges(Connections.map(edge => ({
      id: edge.Id,
      source: edge.FromNodeId,
      target: edge.ToNodeId,
      sourceHandle: `${edge.FromNodeId}-right-${edge.FromNodeOutputPortIndex}`,
      targetHandle: `${edge.ToNodeId}-left-${edge.ToNodeInputPortIndex}`,
    })));
  };

  useEffect(() => {
    window.updateFlowFromJSON = updateFlowFromJSON;
  }, [nodeConfigs]);

  useEffect(() => {
    const newTypes = nodeConfigs.reduce((acc, { NodeTypeName }) => {
      acc[NodeTypeName] = CustomNode;
      return acc;
    }, {});
    setNodeTypes(newTypes);
  }, [nodeConfigs]);

  const saveWorkFlow = () => {
    let result = {
      WorflowName: workFlowName,
      TriggerNode: {},
      OperationNodes: [],
      Connections: edges.map(edge => ({
        Id: edge.id,
        FromNodeId: edge.source,
        FromNodeOutputPortIndex: parseInt(edge.sourceHandle.split('-').pop()),
        ToNodeId: edge.target,
        ToNodeInputPortIndex: parseInt(edge.targetHandle.split('-').pop()),
      }))
    };

    const processDynamicElements = (element) => {
      let newObj = {};
      if (element.hasOwnProperty('elementList')) {
        delete element.elementList;
      }
      if (element.type === 'constrainedList' || element.type === 'editableList') {
        newObj[element.name] = [];
        for (let elelist of element.value) {
          let newEleObj = {};
          for (let ele of elelist) {
            Object.assign(newEleObj, processDynamicElements(ele));
          }
          newObj[element.name].push(newEleObj);
        }
      } else if (element.type === 'enum') {
        newObj[element.name] = parseInt(element.value);
      } else {
        newObj[element.name] = element.value;
      }

      return newObj;
    };

    const nodesCopy = JSON.parse(JSON.stringify(nodes));
    nodesCopy.forEach(node => {
      let nodeDetail = {
        NodeTypeName: node.type,
        Id: node.id,
        Type: node.typeDetail,
        CustomName: node.data.label,
        nodePosX: node.position.x,
        nodePosY: node.position.y
      };

      if (node.dynamicElements) {
        node.dynamicElements.forEach(element => {
          let processedElement = processDynamicElements(element);
          Object.assign(nodeDetail, processedElement);
        });
      }

      if (node.id === triggerId || TriggerNodes.includes(node.type)) {
        result.TriggerNode = nodeDetail;
      } else {
        result.OperationNodes.push(nodeDetail);
      }
    });

    window.chrome.webview.postMessage(JSON.stringify(result));
  };

  const getNextNodeId = useCallback(() => {
    const ids = nodes.map((node) => parseInt(node.id));
    const maxId = Math.max(...ids, 0);
    return maxId === -Infinity ? 1 : maxId + 1;
  }, [nodes]);

  const getParentNodeVariables = useCallback(() => {
    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode) return [];

    const uniqueVariables = new Map();

    const recursiveFetch = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const parentNodeIds = edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source);

      parentNodeIds.forEach((parentId) => {
        const parentNode = nodes.find((node) => node.id === parentId);
        if (!parentNode) return;

        parentNode.OutputVariable?.forEach((variable) => {
          const key = `${parentNode.data.label}_${variable}`;
          if (!uniqueVariables.has(key)) {
            uniqueVariables.set(key, { nodeLabel: parentNode.data.label, variableName: variable });
          }
        });

        recursiveFetch(parentId, visited);
      });
    };

    recursiveFetch(selectedNodeId);

    return Array.from(uniqueVariables.values());
  }, [nodes, edges, selectedNodeId]);

  const onConnect = useCallback(
    (params) => {
      if (params.targetHandle === 'End-left-0') {
        
        const existingEdge = edges.find((edge) => edge.target === params.target);
        if (existingEdge) {
          setEdges((edges) => edges.filter((edge) => edge !== existingEdge));
        }
      }
      
      const edgeWithSameId = edges.find((edge) => edge.id === params.id);
      if (!edgeWithSameId) {
        setEdges((edges) => addEdge(params, edges));
        console.log("params ---- >", edges);
      }
      // Corrected source handle ID format
    },
    [edges, setEdges]
  );

  const onParamsChange = (nodeId, newParams) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            dynamicElements: newParams,
          };
        }
        return node;
      })
    );
  };

  const renderNodePanel = () => {
    const selectedNode = nodes.find((node) => node.id === selectedNodeId);
    if (!selectedNode) return null;

    const handleParamsChange = (newParams) => {
      onParamsChange(selectedNodeId, newParams);
    };

    return <PanelTemplate
      NodeTypeName={selectedNode.type}
      dynamicElements={selectedNode.dynamicElements}
      onParamsChange={handleParamsChange}
      variables={getParentNodeVariables()}
    />;
  };

  const handleMaterialSelect = (NodeTypeName) => {

    const templateConfig = nodeConfigs.find(config => config.NodeTypeName === NodeTypeName);
    if (!templateConfig) return;

    let nodeConfig = JSON.parse(JSON.stringify(templateConfig));

    const nodeTypeCount = nodes.filter((node) => node.type === NodeTypeName).length;
    const label = nodeTypeCount === 0 ? `${NodeTypeName}` : `${NodeTypeName} ${nodeTypeCount + 1}`;
    const newNodeId = String(getNextNodeId());
    let newNode = {
      id: newNodeId,
      type: NodeTypeName,
      typeDetail: nodeConfig.TypeDetail,
      OutputVariable: nodeConfig.OutputVariable,
      dynamicElements: JSON.parse(JSON.stringify(nodeConfig.dynamicElements)),
      data: {
        label,
        InputPortsCount: nodeConfig.InputPortsCount,
        OutputPortsCount: nodeConfig.OutputPortsCount,
      },
      position: { x: 100, y: 100 }
    };

    const triggerNodeExists = nodes.some(node => TriggerNodes.includes(node.type));
    const newNodeTypeInTriggerNodes = TriggerNodes.includes(newNode.type);
    if (!triggerNodeExists || !newNodeTypeInTriggerNodes) {
      setNodes((nds) => {
        triggerId = newNode.id;
        return nds.concat(newNode);
      }
      );
      setSelectedNodeId(newNodeId);
    }

  };

  return (
    <div style={{
      position: 'relative',
      height: '100vh',
      background: '#47536d'
    }}>
      
      <div>
        <Sidebar materials={nodeConfigs.map(config => config.NodeTypeName)} onMaterialSelect={handleMaterialSelect} />
      </div>
      <div style={{
        width: '100%',
        height: '100%',
        padding: '20px',
        paddingTop: '45px',
        boxSizing: 'border-box',
      }}>
        <div style={{
          position: 'absolute',
          top: '7px',
          left: '30px',
          right: '20px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: '10px',
          color: '#fff',
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold',
          fontSize: '30px',
        }}>
          WorkFlow
        </div>
        <div style={{
          position: 'absolute',
          top: '15px',
          right: '90px',
        }}>
          <input
            type="text"
            value={workFlowName}
            onChange={(e) => setWorkFlowName(e.target.value)}
          />
        </div>
        <div style={{
          position: 'absolute',
          top: '14px',
          right: '30px',
        }}>
          <button onClick={() => saveWorkFlow()}>
            save
          </button>
        </div>

        <ReactFlow
          style={{
            width: '100%',
            height: '100%',
            background: '#fbfbfb',
            borderRadius: '10px'
          }}
          nodes={nodes.map((node) => ({
            ...node,
            data: {
              ...node.data,
              isSelected: node.id === selectedNodeId,
              onChange: (id) => setSelectedNodeId(id),
            },
          }))}
          onNodesChange={onNodesChange}
          edges={edges}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          {selectedNodeId && (
            <div style={{
              position: 'absolute',
              top: '15px',
              right: '20px',
              bottom: '20px',
              width: '250px',
              backgroundColor: '#fff',
              borderRadius: '10px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
              zIndex: 10,
            }}>
              <button onClick={() => setSelectedNodeId(null)} style={{
                position: 'absolute',
                top: '11px',
                right: '10px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
              }}>
                x
              </button>
              <div>
                {renderNodePanel()}
              </div>
            </div>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
