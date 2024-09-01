import React, { useRef } from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import HighchartsModules from './HighchartsModules';
 
const win = Dimensions.get('window');
const path = FileSystem.documentDirectory + 'dist/highcharts-files/highcharts.js';
const stringifiedScripts = {};

let cdnPath = 'code.highcharts.com/';
let httpProto = 'http://';

export default class HighchartsReactNative extends React.PureComponent {
 
 
  static getDerivedStateFromProps(props, state) {
    let width = Dimensions.get('window').width;
    let height = Dimensions.get('window').height;
    if (!!props.styles) {
      const userStyles = StyleSheet.flatten(props.styles);
      const { width: w, height: h } = userStyles;
      width = w;
      height = h;
    }
    return {
      width: width,
      height: height,
    };
  }

  setHcAssets = async (useCDN) => {
    try {
      //await this.setLayout();
      await this.addScript('highcharts', null, useCDN);
      await this.addScript('highcharts-more', null, useCDN);
      await this.addScript('highcharts-3d', null, useCDN);
      for (const mod of this.state.modules) {
        await this.addScript(mod, true, useCDN);
      }
      this.setState({
        hcModulesReady: true,
      });
    } catch (error) {
      console.error('Failed to fetch scripts or layout. ' + error.message);
    }
  };

  getAssetAsString = async (asset) => {
    const downloadedModules = await FileSystem.readDirectoryAsync(
      FileSystem.cacheDirectory
    );
    let fileName = 'ExponentAsset-' + asset.hash + '.' + asset.type;

    if (!downloadedModules.includes(fileName)) {
      await asset.downloadAsync();
    }

    return await FileSystem.readAsStringAsync(
      FileSystem.cacheDirectory + fileName
    );
  };

  addScript = async (name, isModule, useCDN) => {
    if (useCDN) {
      const response = await fetch(
        httpProto + cdnPath + (isModule ? 'modules/' : '') + name + '.js'
      ).catch((error) => {
        throw error;
      });
      stringifiedScripts[name] = await response.text();
    } else {
      const script = Asset.fromModule(
        isModule && name !== 'highcharts-more' && name !== 'highcharts-3d'
          ? HighchartsModules.modules[name]
          : HighchartsModules[name]
      );
      stringifiedScripts[name] = await this.getAssetAsString(script);
    }
  };

  // setLayout = async () => {
  //   const indexHtml = Asset.fromModule(
  //     require('../highcharts-layout/index.html')
  //   );

  //   this.setState({
  //     layoutHTML: await this.getAssetAsString(indexHtml),
  //   });
  // };

  constructor(props) {
    super(props);
    if (props.useSSL) {
      httpProto = 'https://';
    }

    if (typeof props.useCDN === 'string') {
      cdnPath = props.useCDN;
    }

    // extract width and height from user styles
    const userStyles = StyleSheet.flatten(props.styles);

    this.state = {
      width: userStyles.width || win.width,
      height: userStyles.height || win.height,
      chartOptions: props.options,
      useCDN: props.useCDN || false,
      modules: props.modules || ['solid-gauge'],
      setOptions: props.setOptions || {},
      renderedOnce: false,
      hcModulesReady: false,
    };
    this.webviewRef = null;

    this.setHcAssets(this.state.useCDN);
  }
  componentDidUpdate() {
    // this.webviewRef &&
    //   this.webviewRef.postMessage(this.serialize(this.props.options, true));
  }
  componentDidMount() {
    this.setState({ renderedOnce: true });
  }
  /**
   * Convert JSON to string. When is updated, functions (like events.load)
   * is not wrapped in quotes.
   */
  serialize(chartOptions, isUpdate) {
    var hcFunctions = {},
      serializedOptions,
      i = 0;

    serializedOptions = JSON.stringify(chartOptions, function (val, key) {
      var fcId = '###HighchartsFunction' + i + '###';

      // set reference to function for the later replacement
      if (typeof key === 'function') {
        hcFunctions[fcId] = key.toString();
        i++;
        return isUpdate ? key.toString() : fcId;
      }

      return key;
    });

    // replace ids with functions.
    if (!isUpdate) {
      Object.keys(hcFunctions).forEach(function (key) {
        serializedOptions = serializedOptions.replace(
          '"' + key + '"',
          hcFunctions[key]
        );
      });
    }

    return serializedOptions;
  }
  render() {
    if (this.state.hcModulesReady) {
      const scriptsPath = this.state.useCDN ? httpProto.concat(cdnPath) : path;
      const setOptions = this.state.setOptions;
      const runFirst = `
                window.data = \"${this.props.data ? this.props.data : null}\";
                var modulesList = ${JSON.stringify(this.state.modules)};
                var readable = ${JSON.stringify(stringifiedScripts)}

                function loadScripts(file, callback, redraw) {
                    var hcScript = document.createElement('script');
                    hcScript.innerHTML = readable[file]
                    document.body.appendChild(hcScript);

                    if (callback) {
                        callback.call();
                    }

                    if (redraw) {
                        Highcharts.setOptions('${this.serialize(setOptions)}');
                        Highcharts.chart("container", ${this.serialize(
                          this.props.options
                        )});
                    }
                }

                loadScripts('highcharts', function () {
                    var redraw = modulesList.length > 0 ? false : true;
                    loadScripts('highcharts-more', function () {
                        if (modulesList.length > 0) {
                            for (var i = 0; i < modulesList.length; i++) {
                                if (i === (modulesList.length - 1)) {
                                    redraw = true;
                                } else {
                                    redraw = false;
                                }
                                loadScripts(modulesList[i], undefined, redraw, true);
                            }
                        }
                    }, redraw);
                }, false);

            Highcharts.charts[0].update({
            plotOptions: {
                pie: {
                    events: {
                        click:${this.state?.chartOptions?.plotOptions?.pie?.events?.click?.toString()}
                    }
                }
            }
        });
            `;

      // Create container for the chart
      return (
        <View
          style={[
            this.props.styles,
            { width: this.state.width, height: this.state.height },
          ]}
        >
          <WebView
            ref={this.webviewRef}
            onMessage={
              (event) => {
                try {
                  this.props.onMessage(event.nativeEvent.data); 
                } catch (error) {
                  console.log(error);
                }
              }
            }
            source={{
              html: `<html>
                                <head>
                                  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=0" />
                                  <style>
                                      #container {
                                          width:100%;
                                          height:100%;
                                          top:0;
                                          left:0;
                                          right:0;
                                          bottom:0;
                                          position:absolute;
                                          user-select: none;
                                          -webkit-user-select: none;
                                      }
                              
                                      * {
                                          -webkit-touch-callout: none;
                                          -webkit-user-select: none; /* Disable selection/copy in UIWebView */
                                          -khtml-user-select: none;
                                          -moz-user-select: none;
                                          -ms-user-select: none;
                                          user-select: none;
                                      }
                                  </style>
                                  <script>
                                      const hcUtils = {
                                          // convert string to JSON, including functions.
                                          parseOptions: function (chartOptions) {
                                              const parseFunction = this.parseFunction;
                              
                                              const options = JSON.parse(chartOptions, function (val, key) {
                                                  if (typeof key === 'string' && key.indexOf('function') > -1) {
                                                      return parseFunction(key);
                                                  } else {
                                                      return key;
                                                  }
                                              });
                              
                                              return options;
                                          },
                                          // convert funtion string to function
                                          parseFunction: function (fc) {
                              
                                              const fcArgs = fc.match(/\((.*?)\)/)[1],
                                                  fcbody = fc.split('{');
                              
                                              return new Function(fcArgs, '{' + fcbody.slice(1).join('{'));
                                          }
                                      };
                              
                                      // Communication between React app and webview. Receive chart options as string.
                                      document.addEventListener('message', function (data) {
                                          Highcharts.charts[0].update(
                                              hcUtils.parseOptions(data.data),
                                              true,
                                              true,
                                              true
                                          );
                                      });
                              
                                      window.addEventListener('message', function (data) {
                                          Highcharts.charts[0].update(
                                              hcUtils.parseOptions(data.data),
                                              true,
                                              true,
                                              true
                                          );
                                      });
                                     </script>
                                </head>
                                <body>
                                    <div id="container"></div>
                                </body>
                              </html>`
            }}
            injectedJavaScript={runFirst}
            originWhitelist={['*']}
            automaticallyAdjustContentInsets={true}
            allowFileAccess={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            useWebKit={true}
            scrollEnabled={false}
            mixedContentMode="always"
            allowFileAccessFromFileURLs={true}
            startInLoadingState={this.props.loader}
            style={this.props.webviewStyles}
            // androidHardwareAccelerationDisabled
            // {...this.props.webviewProps}
          />
        </View>
      );
    } else {
      return <View></View>;
    }
  }
}
