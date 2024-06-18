import React from 'react';

export default function Sidebar({ onMaterialSelect, materials }) {
    
    return (
        <div style={{
            borderRadius: '10px',
            margin: '10px',
            overflowY: 'auto',
            position: 'absolute',
            width: '150px',
            height: 'auto',
            left: '30px',
            top: '50px',
            bottom: '25px',
            background: '#eee',
            padding: '10px',
            boxSizing: 'border-box',
            zIndex: 10
        }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {materials.map((material) => (
                    <li key={material}
                        style={{ margin: '10px 0', cursor: 'pointer' }}
                        onClick={() => onMaterialSelect(material)}>
                        {material}
                    </li>
                ))}
            </ul>
        </div>
    );
}