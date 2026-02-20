'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Monitor, ShieldCheck, ClipboardCheck, Car, Plane, Factory } from 'lucide-react';

// Custom node component for Existing Tools
function ExistingToolsNode({ data }: any) {
  return (
    <div className="relative px-6 py-4 bg-slate-800 border-2 border-slate-100 rounded-lg shadow-xl min-w-[200px]">
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#eab308', width: 10, height: 10, left: -5 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#eab308', width: 10, height: 10, right: -5 }} 
      />
      <div className="flex flex-col items-center gap-3 mb-2">
        
        <Monitor className="w-8 h-8 text-blue-400" />
        
        <h3 className="text-lg font-bold text-white">{data.label}</h3>
      </div>
      <p className="text-sm text-slate-300">{data.description}</p>
    </div>
  );
}

// Custom node component for Certisen Core
function CertisenCoreNode({ data }: any) {
  return (
    <div className="relative px-6 py-4 bg-slate-800 border-2 border-slate-100  rounded-lg shadow-xl min-w-[220px]">
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#eab308', width: 10, height: 10, left: -5 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="passed" 
        style={{ background: '#22c55e', width: 10, height: 10, right: -5, top: '50%' }} 
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="failed" 
        style={{ background: '#ef4444', width: 10, height: 10, left: -5, bottom: '30%' }} 
      />
      <div className="flex flex-col items-center gap-3 mb-2">
        <div className="relative">
          <Monitor className="w-8 h-8 text-purple-300" />
          <ShieldCheck className="w-4 h-4 text-green-400 absolute -bottom-1 -right-1" />
        </div>
        <h3 className="text-lg font-bold text-white">{data.label}</h3>
      </div>
      <p className="text-sm text-purple-200">{data.description}</p>
    </div>
  );
}

// Custom node component for Validation
function ValidationNode({ data }: any) {
  return (
    <div className="relative px-6 py-4 bg-green-900/40 border-2 border-green-500 rounded-lg shadow-xl min-w-[200px]">
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#22c55e', width: 10, height: 10, left: -5 }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#3b82f6', width: 10, height: 10, right: -5 }} 
      />
      <div className="flex flex-col  items-center gap-3 mb-2">
        <div className="relative">
          <ClipboardCheck className="w-8 h-8 text-green-300" />
          <ShieldCheck className="w-4 h-4 text-green-400 absolute -bottom-1 -right-1" />
        </div>
        <h3 className="text-lg font-bold text-white">{data.label}</h3>
      </div>
    </div>
  );
}

// Custom node component for Application domains
function ApplicationNode({ data }: any) {
  const IconComponent = data.icon;
  return (
    <div className="relative px-6 py-4 bg-blue-900/40 border-2 border-blue-500 rounded-lg shadow-xl min-w-[180px]">
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#3b82f6', width: 10, height: 10, left: -5 }} 
      />
      <div className="flex flex-col items-center gap-3 mb-2">
        <IconComponent className="w-8 h-8 text-blue-300" />
        <h3 className="text-base font-bold text-white">{data.label}</h3>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  existingTools: ExistingToolsNode,
  certisenCore: CertisenCoreNode,
  validation: ValidationNode,
  application: ApplicationNode,
};

const initialNodes: Node[] = [
  {
    id: 'existing-tools',
    type: 'existingTools',
    data: { 
      label: 'Existing Tools',
      description: 'Modeling Performance Analysis'
    },
    position: { x: 50, y: 100 },
  },
  {
    id: 'certisen-core',
    type: 'certisenCore',
    data: { 
      label: 'Certisen Core',
      description: 'EAL7+/ASIL-D Assurance Level'
    },
    position: { x: 450, y: 100 },
  },
  {
    id: 'validation',
    type: 'validation',
    data: { 
      label: 'Validation',
    },
    position: { x: 780, y: 100 },
  },
  {
    id: 'automotive',
    type: 'application',
    data: { 
      label: 'Automotive',
      icon: Car,
    },
    position: { x: 1050, y: 0 },
  },
  {
    id: 'aerospace',
    type: 'application',
    data: { 
      label: 'Aerospace',
      icon: Plane,
    },
    position: { x: 1050, y: 120 },
  },
  {
    id: 'industry',
    type: 'application',
    data: { 
      label: 'Industry 4.0',
      icon: Factory,
    },
    position: { x: 1050, y: 240 },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e-tools-core',
    source: 'existing-tools',
    target: 'certisen-core',
    type: 'smoothstep',
    label: 'Formal Check',
    animated: true,
    style: { stroke: '#eab308', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#eab308' },
    labelStyle: { fill: '#eab308', fontWeight: 600, fontSize: 12 },
    labelBgStyle: { fill: '#1e293b' },
    labelBgPadding: [8, 8],
  },
  {
    id: 'e-core-tools-back',
    source: 'certisen-core',
    sourceHandle: 'failed',
    target: 'existing-tools',
    type: 'smoothstep',
    label: 'Not Passed',
    animated: true,
    style: { stroke: '#ef4444', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    labelStyle: { fill: '#ef4444', fontWeight: 600, fontSize: 12 },
    labelBgStyle: { fill: '#1e293b' },
    labelBgPadding: [8, 8],
  },
  {
    id: 'e-core-validation',
    source: 'certisen-core',
    sourceHandle: 'passed',
    target: 'validation',
    type: 'smoothstep',
    label: 'Passed',
    animated: true,
    style: { stroke: '#22c55e', strokeWidth: 3 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
    labelStyle: { fill: '#22c55e', fontWeight: 600, fontSize: 12 },
    labelBgStyle: { fill: '#1e293b' },
    labelBgPadding: [8, 8],
  },
  {
    id: 'e-validation-automotive',
    source: 'validation',
    target: 'automotive',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
  {
    id: 'e-validation-aerospace',
    source: 'validation',
    target: 'aerospace',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
  {
    id: 'e-validation-industry',
    source: 'validation',
    target: 'industry',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#3b82f6', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
  },
];

export default function TSNNetworkDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-[600px] rounded-lg  overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.5 }}
        minZoom={1}
        maxZoom={1}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
  


          nodesDraggable={false}
  nodesConnectable={false}
  elementsSelectable={false}
  panOnDrag={false}
  zoomOnScroll={false}
  zoomOnPinch={false}
  zoomOnDoubleClick={false}

      >
        <Background color="#3a5287" gap={1} />
       </ReactFlow>
    </div>
  );
}
