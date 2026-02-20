'use client';

import { useRive, useRiveFile, useViewModel, useViewModelInstance, useViewModelInstanceBoolean } from '@rive-app/react-canvas';




export default function AutoAnimation() {

  const { rive, RiveComponent } = useRive({
    src: '/rive/taxi.riv',
    stateMachines: 'State Machine 1',
    autoBind: true, // This uses the view model instance defined in Rive
    autoplay: true,
    onLoadError: () => console.log("ERROR LOADING RIVE"),
    onLoad: () => console.log("LOADED RIVE"),

 
 
  });
    return (
 <div className='flex flex-row justify-center'>

   <RiveComponent
     style={{ width: '800px', height: '500px' }}
   />
 </div>
    )
}