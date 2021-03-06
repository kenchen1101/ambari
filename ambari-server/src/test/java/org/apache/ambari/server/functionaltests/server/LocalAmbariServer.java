/*
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

package org.apache.ambari.server.functionaltests.server;

import com.google.inject.persist.PersistService;
import org.apache.ambari.server.controller.AmbariServer;
import org.apache.ambari.server.orm.GuiceJpaInitializer;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import com.google.inject.Guice;
import com.google.inject.Injector;
import org.apache.ambari.server.orm.InMemoryDefaultTestModule;
import org.apache.ambari.server.configuration.Configuration;

/**
* Wrap AmbariServer as a testable unit.
*/
public class LocalAmbariServer implements Runnable {

  private static Log LOG = LogFactory.getLog(AmbariServer.class);

  /**
   * Actual ambari server instance.
   */
  private AmbariServer ambariServer = null;

  private Injector injector = null;

  private InMemoryDefaultTestModule module = null;

  /**
   * Default constructor using the default implementation of InMemoryDefaultTestModule.
   */
  public LocalAmbariServer() { this.module = new InMemoryDefaultTestModule(); }

  /**
   * Overloaded constructor for sub-classed InMemoryDefaultTestModule implementations.
   * @param module
   */
  public LocalAmbariServer(InMemoryDefaultTestModule module) { this.module = module; }

  /**
   * Thread entry point.
   */
  @Override
  public void run(){
    try {
      startServer();
    }
    catch (Exception ex) {
      LOG.info("Exception received ", ex);
      throw new RuntimeException(ex);
    }
  }

  /**
   * Configures the Guice injector to use the in-memory test DB
   * and attempts to start an instance of AmbariServer.
   *
   * @throws Exception
   */
  private void startServer() throws Exception {
    /**
     * Specify the temp folder as the source for certificate keys.
     * Without this, the CertificateManager will generate the keys
     * in the current folder (ambari-server) causing issues with
     * rat check.
     */
    String tmpDir = System.getProperty("java.io.tmpdir");
    this.module.getProperties().setProperty(Configuration.SRVR_KSTR_DIR_KEY, tmpDir);
    injector = Guice.createInjector(this.module);

    try {
      LOG.info("Attempting to start ambari server...");

      AmbariServer.setupProxyAuth();
      injector.getInstance(GuiceJpaInitializer.class);
      ambariServer = injector.getInstance(AmbariServer.class);
      ambariServer.initViewRegistry();
      ambariServer.run();
    } catch (InterruptedException ex) {
      LOG.info(ex);
    } catch (Throwable t) {
      LOG.error("Failed to run the Ambari Server", t);
      stopServer();
    }
  }

  /**
   * Attempts to stop the test AmbariServer instance.
   * @throws Exception
   */
  public void stopServer() throws Exception {
    LOG.info("Stopping ambari server...");

    if (ambariServer != null) {
      ambariServer.stop();
    }

    if (injector != null) {
        injector.getInstance(PersistService.class).stop();
    }
  }
}
