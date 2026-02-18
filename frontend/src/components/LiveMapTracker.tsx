import React from 'react';
import { Truck, MapPin, CheckCircle } from 'lucide-react';

interface LiveMapTrackerProps {
    status: 'pending' | 'accepted' | 'in-transit' | 'completed';
    progress: number;
    from: string;
    to: string;
}

const LiveMapTracker: React.FC<LiveMapTrackerProps> = ({ status, progress, from, to }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Truck className="text-blue-600" />
                Live Shipment Tracking
            </h3>

            <div className="relative pt-6 pb-2">
                {/* Progress Bar Container */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-1000 ease-linear relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Moving Truck Icon */}
                        {status === 'in-transit' && (
                            <div className="absolute right-0 -top-3 transform translate-x-1/2 bg-white p-1 rounded-full shadow border">
                                <Truck size={16} className="text-blue-600" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Locations */}
                <div className="flex justify-between mt-4 text-sm text-gray-600">
                    <div className="flex flex-col items-start">
                        <div className="flex items-center gap-1 font-semibold text-gray-900">
                            <MapPin size={16} className="text-green-600" />
                            {from}
                        </div>
                        <span className="text-xs text-gray-400 pl-5">Dispatch</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 font-semibold text-gray-900">
                            {status === 'completed' ? (
                                <CheckCircle size={16} className="text-green-600" />
                            ) : (
                                <MapPin size={16} className="text-red-600" />
                            )}
                            {to}
                        </div>
                        <span className="text-xs text-gray-400 pr-5">Destination</span>
                    </div>
                </div>
            </div>

            {/* Status Badge */}
            <div className="mt-4 flex justify-center">
                <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide
          ${status === 'completed' ? 'bg-green-100 text-green-700' :
                        status === 'in-transit' ? 'bg-blue-100 text-blue-700' :
                            status === 'accepted' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                    }
        `}>
                    {status.replace('-', ' ')}
                </span>
            </div>
        </div>
    );
};

export default LiveMapTracker;
