# DEPRECATED: Legacy JavaScript Integration
This document is archived and no longer maintained. The frontend now uses React components and backend API endpoints for all data processing and analysis. Refer to the main README.md for up-to-date integration details.

# Legacy JavaScript Integration with React

This document explains the approach used to integrate the existing JavaScript code with the new React application.

## Table of Contents

1. [Overview](#overview)
2. [Integration Strategy](#integration-strategy)
3. [Key Components](#key-components)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Special Considerations](#special-considerations)
7. [Examples](#examples)

## Overview

The legacy JavaScript code consists of several modules that handle different aspects of the Twitter analysis process:

- **fileHandler.js**: File reading and parsing functions
- **dataProcessor.js**: Processing and analyzing tweet data
- **apiHandler.js**: Calling external APIs for AI analysis
- **chartHandler.js**: Generating charts and visualizations
- **imageHandler.js**: Analyzing images with AI
- **rateLimiter.js**: Rate limiting for free users
- **pdfHandler.js**: Generating PDF reports

The integration approach involves:

1. Dynamically loading these scripts in the React application
2. Creating wrapper functions to call the legacy functions
3. Using React hooks to manage state and lifecycle
4. Creating a context for sharing processed data

## Integration Strategy

Our approach consists of four main strategies:

### 1. Dynamic Script Loading

We use a `LegacyScriptLoader` component to dynamically load the external JS files in the correct order.

### 2. Wrapper Functions

In `legacyIntegration.js`, we create wrapper functions for each legacy function that:
- Handle loading state
- Provide proper error handling
- Convert callbacks to promises where necessary
- Validate inputs

### 3. Custom Hooks

We've created several custom hooks that provide React-friendly interfaces to the legacy code:
- `useTweetFileProcessor`: Handles file upload and processing
- `useTweetAnalysis`: Manages analysis state and API calls
- `useChartGeneration`: Handles chart creation and updates
- `usePaymentHandler`: Manages payment flow with Stripe

### 4. Global Context

The `TweetDataContext` provides global state management for:
- Processed tweet data
- Selected timeframe
- User payment status

## Key Components

### LegacyScriptLoader

This component loads all required JavaScript files in the correct order and verifies that the necessary functions are available before rendering the application.

```jsx
<LegacyScriptLoader onLoad={handleScriptsLoaded} onError={handleScriptsError}>
  <App />
</LegacyScriptLoader>
```

### Integration Utilities

The `legacyIntegration.js` file contains wrapper functions for all legacy JavaScript functions. These wrappers handle:
- Checking if the code is running on the client side
- Validating inputs
- Error handling
- Converting to promises

### Custom Hooks

Custom hooks provide a declarative interface to the imperative legacy code:

```jsx
const {
  file,
  fileName,
  handleFileSelect,
  processFile,
  isProcessing,
  error
} = useTweetFileProcessor({ isPaidUser });
```

## Data Flow

The overall data flow is as follows:

1. **File Upload**: User uploads a tweets.js file
2. **Processing**: Legacy JS processes the file and extracts data
3. **State Management**: Processed data is stored in React context
4. **Analysis**: React components request specific analyses using the hooks
5. **Rendering**: Analysis results are rendered in the UI
6. **Interactivity**: User interactions (like changing timeframe) trigger updates

```
┌─────────────┐     ┌────────────────┐     ┌────────────────┐
│ File Upload │ ──> │ Legacy JS Code │ ──> │ React Context  │
└─────────────┘     └────────────────┘     └────────────────┘
                                                  │
                                                  ▼
┌─────────────┐     ┌────────────────┐     ┌────────────────┐
│ React UI    │ <── │ React Hooks    │ <── │ API Requests   │
└─────────────┘     └────────────────┘     └────────────────┘
```

## State Management

We use a combination of local component state and global context for state management:

### Local State (Component-specific)

- Loading/error states
- UI state (e.g., active tab, form values)
- Temporary data

### Global State (Context)

- Processed tweet data
- Selected timeframe
- Payment status
- User preferences

This hybrid approach allows for efficient component rendering while maintaining a single source of truth for important data.

## Special Considerations

### Window Dependencies

The legacy code attaches many functions and variables to the global `window` object. Our integration respects this pattern:

1. We set important values on `window`:
   ```javascript
   window.selectedTimeframe = timeframe;
   window.isPaidUser = isPaidUser;
   ```

2. We access functions from `window`:
   ```javascript
   await window.getExecutiveSummary(processedData);
   ```

### Direct DOM Manipulation

The legacy code directly manipulates the DOM, especially for charts. We address this by:

1. Creating ref objects for elements that need to be manipulated
2. Ensuring elements are rendered before legacy code tries to access them
3. Adding cleanup functions to prevent memory leaks

### SSR Compatibility

To ensure server-side rendering compatibility, we check if the code is running on the client:

```javascript
const isClient = typeof window !== 'undefined';

if (!isClient) {
  return null; // or fallback content
}
```

## Examples

### Basic Usage in a Component

```jsx
import React, { useEffect, useState } from 'react';
import { useTweetData } from '../context/TweetDataContext';
import { getActivityAnalysis } from '../utils/legacyIntegration';

const ActivityAnalysisSection = () => {
  const { processedData } = useTweetData();
  const [loading, setLoading] = useState(false);
  const [analysisHtml, setAnalysisHtml] = useState('');
  
  useEffect(() => {
    if (!processedData) return;
    
    setLoading(true);
    
    getActivityAnalysis(processedData)
      .then(html => setAnalysisHtml(html))
      .catch(error => console.error(error))
      .finally(() => setLoading(false));
  }, [processedData]);
  
  if (loading) {
    return <div>Loading activity analysis...</div>;
  }
  
  return (
    <div 
      className="activity-analysis"
      dangerouslySetInnerHTML={{ __html: analysisHtml }} 
    />
  );
};
```

### Using the File Processor Hook

```jsx
import React from 'react';
import useTweetFileProcessor from '../hooks/useTweetFileProcessor';

const FileUpload = () => {
  const {
    file,
    handleFileSelect,
    processFile,
    isProcessing,
    error
  } = useTweetFileProcessor();
  
  return (
    <div>
      <input type="file" onChange={e => handleFileSelect(e.target.files[0])} />
      
      {file && (
        <button 
          onClick={processFile}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Analyze Tweets'}
        </button>
      )}
      
      {error && <div className="error">{error}</div>}
    </div>
  );
};
```

### Chart Generation with Refs

```jsx
import React, { useRef, useEffect } from 'react';
import { useTweetData } from '../context/TweetDataContext';
import useChartGeneration from '../hooks/useChartGeneration';

const ActivityChart = () => {
  const { processedData } = useTweetData();
  const chartRef = useRef(null);
  
  const { setChartRef, generateAllCharts, isGenerating } = useChartGeneration({
    processedData,
    autoGenerate: false
  });
  
  useEffect(() => {
    if (chartRef.current) {
      setChartRef('activityChart', chartRef.current);
    }
  }, [chartRef.current, setChartRef]);
  
  useEffect(() => {
    if (processedData && chartRef.current) {
      generateAllCharts();
    }
  }, [processedData, chartRef.current, generateAllCharts]);
  
  return (
    <div className="chart-container">
      <h3>Posting Activity</h3>
      
      {isGenerating ? (
        <div className="loading">Generating chart...</div>
      ) : (
        <canvas ref={chartRef} id="activityChart" width="400" height="300"></canvas>
      )}
    </div>
  );
};
```