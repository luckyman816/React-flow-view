//CustomNode.js
import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';

const CustomNode = ({ id, data }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { label, isSelected, InputPortsCount, OutputPortsCount } = data;

    const createLeftHandles = () =>
        Array.from({ length: InputPortsCount }, (_, index) => (
            <Handle
                key={`${id}-left-${index}`}
                type="target"
                position={Position.Left}
                id={`${id}-left-${index}`}
                style={{ backgroundColor: '#555', top: `${(100 / (InputPortsCount + 1)) * (index + 1)}%` }}
            />
        ));

    const createRightHandles = () =>
        Array.from({ length: OutputPortsCount }, (_, index) => (
            <Handle
                key={`${id}-right-${index}`}
                type="source"
                position={Position.Right}
                id={`${id}-right-${index}`}
                style={{ backgroundColor: '#555', top: `${(100 / (OutputPortsCount + 1)) * (index + 1)}%` }}
            />
        ));
    return (
        <div
            style={{
                border: '2.5px solid #e9e9e9',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontFamily: 'Arial, sans-serif',
                backgroundColor: '#fff',
                color: '#333',
                height: '40px',
                width: '150px',
                transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
                boxShadow: isHovered ? '0px 0px 20px rgba(0, 0, 0, 0.15)' : '0px 0px 10px rgba(0, 0, 0, 0.1)',
                border: isSelected ? '1.5px dashed black' : '1px solid #222',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => data.onChange(id)}
        >

            {createLeftHandles()}
            {createRightHandles()}
            {data.label}
        </div>
    );
};

export default CustomNode;