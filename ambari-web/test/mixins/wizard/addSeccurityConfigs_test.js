/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
var stackDescriptorData = require('test/mock_data_setup/stack_descriptors');
var stackDescriptor = stackDescriptorData.artifact_data;

require('mixins/wizard/addSecurityConfigs');

describe('App.AddSecurityConfigs', function () {

  var controller = Em.Object.extend(App.AddSecurityConfigs,{}).create({
    content: {},
    enableSubmit: function () {
      this._super();
    }
  });


  describe('#createServicesStackDescriptorConfigs', function() {
    var result = controller.createServicesStackDescriptorConfigs(stackDescriptorData);
    var propertyValidationTests = [
      {
        property: 'spnego_keytab',
        e: [
          { key: 'value', value: '${keytab_dir}/spnego.service.keytab' },
          { key: 'serviceName', value: 'Cluster' }
        ]
      },
      // principal name inherited from /spnego with predefined value
      {
        property: 'oozie.authentication.kerberos.principal',
        e: [
          { key: 'value', value: 'HTTP/${host}@${realm}' },
          { key: 'isEditable', value: true }
        ]
      },
      // keytab inherited from /spnego without predefined file value
      {
        property: 'oozie.authentication.kerberos.keytab',
        e: [
          { key: 'value', value: null },
          { key: 'isEditable', value: false },
          { key: 'referenceProperty', value: 'spnego:keytab' },
          { key: 'observesValueFrom', value: 'spnego_keytab' }
        ]
      }
    ];

    propertyValidationTests.forEach(function(test) {
      it('property {0} should be created'.format(test.property), function() {
        expect(result.findProperty('name', test.property)).to.be.ok;
      });
      test.e.forEach(function(expected) {
        it('property `{0}` should have `{1}` with value `{2}`'.format(test.property, expected.key, expected.value), function() {
          expect(result.findProperty('name', test.property)).to.have.deep.property(expected.key, expected.value);
        });
      });
    });
  });

  describe('#expandKerberosStackDescriptorProps', function() {
    var serviceName = 'Cluster';
    var result = controller.expandKerberosStackDescriptorProps(stackDescriptor.properties, serviceName);
    var testCases = [
      {
        property: 'realm',
        e: [
          { key: 'isEditable', value: false },
          { key: 'serviceName', value: 'Cluster' }
        ]
      },
      {
        property: 'keytab_dir',
        e: [
          { key: 'isEditable', value: true },
          { key: 'serviceName', value: 'Cluster' }
        ]
      }
    ];
    testCases.forEach(function(test) {
      it('property {0} should be created'.format(test.property), function() {
        expect(result.findProperty('name', test.property)).to.be.ok;
      });
      test.e.forEach(function(expected) {
        it('property `{0}` should have `{1}` with value `{2}`'.format(test.property, expected.key, expected.value), function() {
          expect(result.findProperty('name', test.property)).to.have.deep.property(expected.key, expected.value);
        });
      });
    });
  });

  describe('#createConfigsByIdentity', function() {
    var identitiesData = stackDescriptor.services[0].components[0].identities;
    var tests = [
      {
        property: 'dfs.namenode.kerberos.principal',
        e: [
          { key: 'value', value: 'nn/_HOST@${realm}' }
        ]
      },
      {
        property: 'dfs.web.authentication.kerberos.principal',
        e: [
          { key: 'referenceProperty', value: 'spnego:principal' },
          { key: 'isEditable', value: false }
        ]
      }     
    ];
    var properties = controller.createConfigsByIdentities(identitiesData, 'HDFS');
    tests.forEach(function(test) {
      it('property {0} should be created'.format(test.property), function() {
        expect(properties.findProperty('name', test.property)).to.be.ok;
      });
      test.e.forEach(function(expected) {
        it('property `{0}` should have `{1}` with value `{2}`'.format(test.property, expected.key, expected.value), function() {
          expect(properties.findProperty('name', test.property)).to.have.deep.property(expected.key, expected.value);
        });
      });
    });
  });

  describe('#parseIdentityObject', function() {
    var testCases = [
      {
        identity: stackDescriptor.services[0].components[0].identities[0],
        tests: [
          {
            property: 'dfs.namenode.kerberos.principal',
            e: [
              { key: 'filename', value: 'hdfs-site' }
            ]
          },
          {
            property: 'dfs.namenode.keytab.file',
            e: [
              { key: 'value', value: '${keytab_dir}/nn.service.keytab' }
            ]
          }
        ]
      },
      {
        identity: stackDescriptor.services[0].components[0].identities[1],
        tests: [
          {
            property: 'dfs.namenode.kerberos.https.principal',
            e: [
              { key: 'filename', value: 'hdfs-site' }
            ]
          }
        ]
      },
      {
        identity: stackDescriptor.identities[0],
        tests: [
          {
            property: 'spnego_principal',
            e: [
              { key: 'displayName', value: 'Spnego Principal' },
              { key: 'filename', value: 'cluster-env' }
            ]
          }
        ]
      },
      {
        identity: stackDescriptor.identities[0],
        tests: [
          {
            property: 'spnego_keytab',
            e: [
              { key: 'displayName', value: 'Spnego Keytab' },
              { key: 'filename', value: 'cluster-env' }
            ]
          }
        ]
      }
    ];
    
    testCases.forEach(function(testCase) {
      testCase.tests.forEach(function(test) {
        var result = controller.parseIdentityObject(testCase.identity);
        it('property `{0}` should be present'.format(test.property), function() {
          expect(result.findProperty('name', test.property)).to.be.ok;
        });
        test.e.forEach(function(expected) {
          it('property `{0}` should have `{1}` with value `{2}`'.format(test.property, expected.key, expected.value), function() {
            expect(result.findProperty('name', test.property)).to.have.deep.property(expected.key, expected.value);
          });
        });
      });
    });
  });

  describe('#processConfigReferences', function() {
    var generateProperty = function(name, reference) {
      return Em.Object.create({ name: name, referenceProperty: reference});
    };
    var descriptor = {
      identities: [
        { name: 'spnego', principal: { value: 'spnego_value' }, keytab: { file: 'spnego_file'} },
        { name: 'hdfs',
          principal: { value: 'hdfs_value', configuration: "hadoop-env/hdfs_user_principal_name" },
          keytab: { file: 'hdfs_file', configuration: "hadoop-env/hdfs_user_keytab"} }
      ],
      services: [
        {
          name: 'SERVICE',
          identities: [
            { name: '/spnego' },
            { name: '/hdfs' }
          ]
        },
        {
          name: 'SERVICE2',
          components: [
            {
              name: 'COMPONENT',
              identities: [
                {
                  name: 'component_prop1',
                  keytab: { configuration: 'service2-site/component.keytab' },
                  principal: { configuration: null }
                },
                {
                  name: 'component_prop2',
                  keytab: { configuration: 'service2-site/component2.keytab' },
                  principal: { configuration: 'service2-site/component2.principal' }
                }
              ]
            }
          ]
        }
      ]
    };
    var configs = Em.A([
      generateProperty('spnego_inherited_keytab', 'spnego:keytab'),
      generateProperty('spnego_inherited_principal', 'spnego:principal'),
      generateProperty('hdfs_inherited_keytab', 'hdfs:keytab'),
      generateProperty('hdfs_inherited_principal', 'hdfs:principal'),
      generateProperty('component_prop1_inherited_principal', 'component_prop1:principal'),
      generateProperty('component_prop1_inherited_keytab', 'component_prop1:keytab'),
      generateProperty('component_prop2_inherited_keytab', 'component_prop2:keytab'),
      generateProperty('component_prop2_inherited_principal', 'component_prop2:principal')
    ]);
    var tests = [
      { name: 'spnego_inherited_keytab', e: 'spnego_keytab' },
      { name: 'spnego_inherited_principal', e: 'spnego_principal' },
      { name: 'hdfs_inherited_keytab', e: 'hdfs_user_keytab' },
      { name: 'hdfs_inherited_principal', e: 'hdfs_user_principal_name' },
      { name: 'component_prop1_inherited_keytab', e: 'component.keytab' },
      { name: 'component_prop1_inherited_principal', e: 'component_prop1_principal' },
      { name: 'component_prop2_inherited_keytab', e: 'component2.keytab' },
      { name: 'component_prop2_inherited_principal', e: 'component2.principal' }
    ];
    before(function() {
      controller.processConfigReferences(descriptor, configs);
    });
    
    tests.forEach(function(test) {
      it('`{0}` should observe value from `{1}` property'.format(test.name, test.e), function() {
        expect(configs.findProperty('name', test.name).get('observesValueFrom')).to.be.eql(test.e); 
      });
    });
  });

  describe('#_getDisplayNameForConfig', function () {

    it('config from `cluster-env`', function () {
      var config = {
        fileName: 'cluster-env',
        name: 'someCoolName'
      };
      var displayName = controller._getDisplayNameForConfig(config.name, config.fileName);
      expect(displayName).to.equal(App.format.normalizeName(config.name));
    });
  });

});
