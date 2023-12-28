/* global describe, beforeEach, it, before, afterEach, Meteor */

import { expect } from 'chai';
import { FilesCollection } from '../server';
import sinon from 'sinon';
import fs from 'fs';

describe('FilesCollection Constructor', function() {
  describe('constructor', function() {
    it('should create an instance of FilesCollection', async function() {
      const filesCollection = new FilesCollection({ collectionName: 'test123'});
      expect(filesCollection instanceof FilesCollection).to.be.true;
    });
  });
});


describe('FilesCollection', () => {
  describe('#_prepareUpload', () => {
    let filesCollection;
    let opts;
    let userId;
    let transport;
    let namingFunctionStub;
    let onBeforeUploadStub;
    let onInitiateUploadStub;

    before(() =>{
      filesCollection = new FilesCollection({ collectionName: 'testserver-prepareUpload', namingFunction: () => {}, onBeforeUpload: () => {}, onInitiateUpload: () => {}});
    });

    beforeEach(() => {
      opts = {
        file: {
          name: 'testFile',
          meta: {},
        },
        fileId: '123',
      };
      userId = 'user1';
      transport = 'http';

      // Stubbing the namingFunction method
      namingFunctionStub = sinon.stub(filesCollection, 'namingFunction');
      namingFunctionStub.returns('newName');

      // Stubbing the onBeforeUpload method
      onBeforeUploadStub = sinon.stub(filesCollection, 'onBeforeUpload');
      onBeforeUploadStub.returns(true);

      // Stubbing the onInitiateUpload method
      onInitiateUploadStub = sinon.stub(filesCollection, 'onInitiateUpload');
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should prepare upload successfully', () => {
      const { result, opts: newOpts } = filesCollection._prepareUpload(opts, userId, transport);

      expect(result).to.be.an('object');
      expect(newOpts).to.be.an('object');
      expect(namingFunctionStub.calledOnce).to.be.true;
      expect(onBeforeUploadStub.calledOnce).to.be.true;
      expect(onInitiateUploadStub.called).to.be.false;
    });
  });

  describe('#_prepareUploadAsync', () => {
    let filesCollection;
    let opts;
    let userId;
    let transport;
    let namingFunctionStub;
    let onBeforeUploadAsyncStub;
    let onInitiateUploadStub;

    before(() =>{
      filesCollection = new FilesCollection({ collectionName: 'testserver-prepareUploadAsync', namingFunction: () => {}, onBeforeUploadAsync: async () => {}, onInitiateUpload: async () => {}});
    });

    beforeEach(() => {
      opts = {
        file: {
          name: 'testFile',
          meta: {},
        },
        fileId: '123',
      };
      userId = 'user1';
      transport = 'http';

      // Stubbing the namingFunction method
      namingFunctionStub = sinon.stub(filesCollection, 'namingFunction');
      namingFunctionStub.returns('newName');

      // Stubbing the onBeforeUpload method
      onBeforeUploadAsyncStub = sinon.stub(filesCollection, 'onBeforeUploadAsync');
      onBeforeUploadAsyncStub.resolves(true);

      // Stubbing the onInitiateUpload method
      onInitiateUploadStub = sinon.stub(filesCollection, 'onInitiateUpload');
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should prepare upload successfully', async () => {
      const { result, opts: newOpts } = await  filesCollection._prepareUploadAsync(opts, userId, transport);

      expect(result).to.be.an('object');
      expect(newOpts).to.be.an('object');
      expect(namingFunctionStub.calledOnce).to.be.true;
      expect(onBeforeUploadAsyncStub.calledOnce).to.be.true;
      expect(onInitiateUploadStub.called).to.be.false;
    });

    it('should return the same result and opts as the sync version', async () => {
      const { result, opts: newOpts } = await  filesCollection._prepareUploadAsync(opts, userId, transport);
      const { result: resultSync, opts: newOptsSync } = filesCollection._prepareUpload(opts, userId, transport);

      expect(result).to.deep.equal(resultSync);
      expect(newOpts).to.deep.equal(newOptsSync);
    });
  });

  describe('#_finishUpload', () => {
    let filesCollection;
    let result;
    let opts;
    let cb;
    let chmodStub;
    let insertStub;
    let updateStub;
    let onAfterUploadSpy;

    before(() => {
      filesCollection = new FilesCollection({ collectionName: 'testserver-finishUpload'});
    });

    beforeEach(() => {
      result = { path: '/path/to/file' };
      opts = { file: { name: 'testFile', meta: {} } };
      cb = sinon.stub();

      // Stubbing the fs.chmod method
      chmodStub = sinon.stub(fs, 'chmod');
      chmodStub.callsFake((path, permissions, callback) => callback());

      // Stubbing the collection.insert method
      insertStub = sinon.stub(filesCollection.collection, 'insert');
      insertStub.callsFake((doc, callback) => callback(null, '123'));

      // Stubbing the _preCollection.update method
      updateStub = sinon.stub(filesCollection._preCollection, 'update');
      updateStub.callsFake((query, update, callback) => callback());

      // Creating a spy for the onAfterUpload hook
      onAfterUploadSpy = sinon.spy();
      filesCollection.onAfterUpload = onAfterUploadSpy;
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should finish upload successfully', () => {
      filesCollection._finishUpload(result, opts, cb);

      expect(chmodStub.calledOnce).to.be.true;
      expect(insertStub.calledOnce).to.be.true;
      expect(updateStub.calledOnce).to.be.true;
      expect(cb.calledOnce).to.be.true;
      expect(cb.calledWith(null, result)).to.be.true;
    });

    it('should call callback with a single error argument if insert fails', () => {
      const error = new Meteor.Error(500, 'Insert failed');
      insertStub.callsFake((doc, callback) => { callback(error);});

      filesCollection._finishUpload(result, opts, cb);

      expect(chmodStub.calledOnce).to.be.true;
      expect(insertStub.calledOnce).to.be.true;
      expect(updateStub.called).to.be.false;
      expect(cb.calledOnce).to.be.true;
      expect(cb.calledWith(error)).to.be.true;
    });

    it('should call callback with a single error argument if update fails', () => {
      const error = new Meteor.Error(500, 'Update failed');
      updateStub.callsFake((query, update, callback) => { callback(error);});

      filesCollection._finishUpload(result, opts, cb);

      expect(chmodStub.calledOnce).to.be.true;
      expect(insertStub.calledOnce).to.be.true;
      expect(updateStub.calledOnce).to.be.true;
      expect(cb.calledOnce).to.be.true;
      expect(cb.calledWith(error)).to.be.true;
    });

    it('should call onAfterUpload hook if it is a function', () => {
      filesCollection._finishUpload(result, opts, cb);

      expect(onAfterUploadSpy.calledOnce).to.be.true;
      expect(onAfterUploadSpy.calledWith(result)).to.be.true;
    });
  });

  describe('#_finishUploadAsync', () => {
    let filesCollection;
    let result;
    let opts;
    let chmodStub;
    let insertStub;
    let updateStub;
    let onAfterUploadAsyncSpy;

    before(() => {
      filesCollection = new FilesCollection({ collectionName: 'testserver-finishUploadAsync'});
    });

    beforeEach(() => {
      result = { path: '/path/to/file' };
      opts = { file: { name: 'testFile', meta: {} } };

      // Stubbing the fs.promises.chmod method
      chmodStub = sinon.stub(fs.promises, 'chmod');
      chmodStub.resolves();

      // Stubbing the collection.insertAsync method
      insertStub = sinon.stub(filesCollection.collection, 'insertAsync');
      insertStub.resolves('123');

      // Stubbing the _preCollection.updateAsync method
      updateStub = sinon.stub(filesCollection._preCollection, 'updateAsync');
      updateStub.resolves();

      // Creating a spy for the onAfterUpload hook
      onAfterUploadAsyncSpy = sinon.spy();
      filesCollection.onAfterUploadAsync = onAfterUploadAsyncSpy;
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should finish upload successfully', async () => {
      await filesCollection._finishUploadAsync(result, opts);

      expect(chmodStub.calledOnce).to.be.true;
      expect(insertStub.calledOnce).to.be.true;
      expect(updateStub.calledOnce).to.be.true;
    });

    it('should throw an error if insert fails', async () => {
      const error = new Meteor.Error(500, 'Insert failed');
      insertStub.throws(error);

      let errorThrown;
      try {
        await filesCollection._finishUploadAsync(result, opts);
      } catch (e) {
        errorThrown = e;
      }

      expect(chmodStub.calledOnce).to.be.true;
      expect(insertStub.calledOnce).to.be.true;
      expect(updateStub.called).to.be.false;
      expect(errorThrown).to.be.instanceOf(Meteor.Error);
    });

    it('should throw an error if update fails', async () => {
      const error = new Meteor.Error(500, 'Update failed');
      updateStub.throws(error);

      let errorThrown;
      try {
        await filesCollection._finishUploadAsync(result, opts);
      } catch (e) {
        errorThrown = e;
      }

      expect(chmodStub.calledOnce).to.be.true;
      expect(insertStub.calledOnce).to.be.true;
      expect(updateStub.calledOnce).to.be.true;
      expect(errorThrown).to.be.instanceOf(Meteor.Error);
    });

    it('should call onAfterUpload hook if it is a function', async () => {
      await filesCollection._finishUploadAsync(result, opts);

      expect(onAfterUploadAsyncSpy.calledOnce).to.be.true;
      expect(onAfterUploadAsyncSpy.calledWith(result)).to.be.true;
    });
  });

  describe('#addFileAsync', () => {
    let filesCollection;
    let path;
    let opts;
    let proceedAfterUpload;

    before(() => {
      filesCollection = new FilesCollection({ collectionName: 'testserver', onAfterUpload: () => {}});
      path = '/tmp/meteor-test-file.txt';
      fs.writeFileSync(path, 'test');
      opts = { type: 'text/plain'};
      proceedAfterUpload = false;
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should add a file successfully', async () => {
      const result = await filesCollection.addFileAsync(path, opts, proceedAfterUpload);

      // Check if the result is correct
      expect(result).to.be.an('object');
      expect(result).to.have.property('_id');
      expect(result).to.have.property('name', 'meteor-test-file.txt');
      expect(result).to.have.property('size', 4);
      expect(result).to.have.property('type', 'text/plain');
      expect(result).to.have.property('extension', 'txt');
      expect(result).to.have.property('extensionWithDot', '.txt');
      expect(result).to.have.property('path', path);

      // Check if the file exists in the database
      const file = await filesCollection.collection.findOneAsync({ _id: result._id });
      expect(file).to.be.an('object');
      expect(file).to.have.property('_id');
      expect(file).to.have.property('name', 'meteor-test-file.txt');
      expect(file).to.have.property('size', 4);
      expect(file).to.have.property('type', 'text/plain');
      expect(file).to.have.property('extension', 'txt');
      expect(file).to.have.property('extensionWithDot', '.txt');
      expect(file).to.have.property('path', path);
    });

    it('should call onAfterUpload hook if flag is true', async () => {
      // Stub the `onAfterUpload` method
      sinon.stub(filesCollection, 'onAfterUpload');

      await filesCollection.addFileAsync(path, opts, true);

      expect(filesCollection.onAfterUpload.calledWith()).to.be.true;
    });

    it('should not call onAfterUpload hook if flag is false', async () => {
      // Stub the `onAfterUpload` method
      sinon.stub(filesCollection, 'onAfterUpload');

      await filesCollection.addFileAsync(path, opts, false);

      expect(filesCollection.onAfterUpload.calledWith()).to.be.false;
    });

    it('should throw an error if file does not exist', async () => {
      const nonExistingPath = '/tmp/meteor-test-file-non-existing.txt';
      try {
        await filesCollection.addFileAsync(nonExistingPath, opts, proceedAfterUpload);
      } catch (e) {
        expect(e).to.be.instanceOf(Meteor.Error);
        expect(e.error).to.equal(400);
      }
    }
    );

    it('should throw an error if file is not readable', async () => {
      const nonReadablePath = '/tmp/meteor-test-file-non-readable.txt';
      fs.writeFileSync(nonReadablePath, 'test');
      fs.chmodSync(nonReadablePath, 0o200);
      try {
        await filesCollection.addFileAsync(nonReadablePath, opts, proceedAfterUpload);
      } catch (e) {
        expect(e).to.be.instanceOf(Meteor.Error);
        expect(e.error).to.equal(400);
      }
    });

    it('should throw an error, if path is not a file', async () => {
      const nonFile = '/tmp';
      try {
        await filesCollection.addFileAsync(nonFile, opts, proceedAfterUpload);
      } catch (e) {
        expect(e).to.be.instanceOf(Meteor.Error);
        expect(e.error).to.equal(400);
      }
    });

    it('should throw an error, if file is added to a public collection', async () => {
      const publicFilesCollection = new FilesCollection({ collectionName: 'testserver-pub', public: true, storagePath: '/tmp', downloadRoute: '/public' });
      try {
        await publicFilesCollection.addFileAsync(path, opts, proceedAfterUpload);
      } catch (e) {
        expect(e).to.be.instanceOf(Meteor.Error);
        expect(e.error).to.equal(403);
      }
    });
  });

  describe('#download', () => {
    let filesCollection;
    let http;
    let version;
    let fileRef;
    let statStub;
    let _404Stub;
    let serveStub;

    before(() => {
      filesCollection = new FilesCollection({collectionName: 'testserver-download'});
    });

    beforeEach(() => {
      http = { request: { originalUrl: '/path/to/file', headers: { 'x-mtok': 'token'} }, response: { writeHead: () => {}, end: () => {}} };

      version = 'original';
      fileRef = {
        versions: {
          original: {
            path: '/path/to/file',
            size: 100,
          },
        },
      };

      // Stubbing the fs.stat method
      statStub = sinon.stub(fs, 'stat');
      statStub.yields(null, { isFile: () => true, size: 100 });

      // Stubbing the _404 method
      _404Stub = sinon.stub(filesCollection, '_404');

      // Stubbing the serve method
      serveStub = sinon.stub(filesCollection, 'serve');
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should download a file successfully', () => {
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
    });

    it('should return 404 if file does not exist', () => {
      statStub.yields(null, { isFile: () => false });
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.calledOnce).to.be.true;
      expect(serveStub.called).to.be.false;
    });

    it('should call downloadCallback if it is a function', () => {
      const downloadCallback = sinon.stub().returns(true);
      filesCollection.downloadCallback = downloadCallback;
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
      expect(downloadCallback.calledOnce).to.be.true;
    });

    it('should not call downloadCallback if it is not a function', () => {
      filesCollection.downloadCallback = null;
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
    });

    it('should return 404 if downloadCallback returns false', () => {
      const downloadCallback = sinon.stub().returns(false);
      filesCollection.downloadCallback = downloadCallback;
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.false;
      expect(_404Stub.calledOnce).to.be.true;
      expect(serveStub.called).to.be.false;

      filesCollection.downloadCallback = null;
    });

    it('should call interceptDownload if it is a function, that returns true', () => {
      const interceptDownload = sinon.stub().returns(true);
      filesCollection.interceptDownload = interceptDownload;
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.false;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.false;
      expect(interceptDownload.calledOnce).to.be.true;

      filesCollection.interceptDownload = null;
    });

    it('should proceed if interceptDownload xis a function, that returns false', () => {
      const interceptDownload = sinon.stub().returns(false);
      filesCollection.interceptDownload = interceptDownload;
      filesCollection.download(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
      expect(interceptDownload.calledOnce).to.be.true;

      filesCollection.interceptDownload = null;
    });
  });

  describe('#downloadAsync', () => {
    let filesCollection;
    let http;
    let version;
    let fileRef;
    let statStub;
    let _404Stub;
    let serveStub;

    before(() => {
      filesCollection = new FilesCollection({collectionName: 'testserver-downloadAsync', downloadCallbackAsync: async () => {return true;}});
    });

    beforeEach(() => {
      http = { request: { originalUrl: '/path/to/file', headers: { 'x-mtok': 'token'} }, response: { writeHead: () => {}, end: () => {}} };

      version = 'original';
      fileRef = {
        versions: {
          original: {
            path: '/path/to/file',
            size: 100,
          },
        },
      };

      // Stubbing the fs.promises.stat method
      statStub = sinon.stub(fs.promises, 'stat');
      statStub.resolves({ isFile: () => true, size: 100 });

      // Stubbing the _404 method
      _404Stub = sinon.stub(filesCollection, '_404');

      // Stubbing the serve method
      serveStub = sinon.stub(filesCollection, 'serve');
    });

    afterEach(() => {
      // Restore the stubbed methods after each test
      sinon.restore();
    });

    it('should download a file successfully', async () => {
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
    });

    it('should return 404 if file does not exist', async () => {
      statStub.resolves({ isFile: () => false });
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.calledOnce).to.be.true;
      expect(serveStub.called).to.be.false;
    });

    it('should call downloadCallbackAsync if it is a function', async () => {
      const downloadCallbackAsync = sinon.stub().returns(new Promise((resolve) => resolve(true)));
      filesCollection.downloadCallbackAsync = downloadCallbackAsync;
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
      expect(downloadCallbackAsync.calledOnce).to.be.true;
    });

    it('should not call downloadCallbackAsync if it is not a function', async () => {
      filesCollection.downloadCallbackAsync = null;
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
    });

    it('should return 404 if downloadCallbackAsync returns false', async () => {
      const downloadCallbackAsync = sinon.stub().returns(new Promise((resolve) => resolve(false)));
      filesCollection.downloadCallbackAsync = downloadCallbackAsync;
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.false;
      expect(_404Stub.calledOnce).to.be.true;
      expect(serveStub.called).to.be.false;

      filesCollection.downloadCallbackAsync = null;
    });

    it('should call interceptDownloadAsync if it is a function, that returns true', async () => {
      const interceptDownloadAsync = sinon.stub().resolves(true);
      filesCollection.interceptDownloadAsync = interceptDownloadAsync;
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.false;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.false;
      expect(interceptDownloadAsync.calledOnce).to.be.true;

      filesCollection.interceptDownloadAsync = null;
    });

    it('should proceed if interceptDownload is a function, that returns false', async () => {
      const interceptDownloadAsync = sinon.stub().resolves(false);
      filesCollection.interceptDownloadAsync = interceptDownloadAsync;
      await filesCollection.downloadAsync(http, version, fileRef);

      expect(statStub.calledOnce).to.be.true;
      expect(_404Stub.called).to.be.false;
      expect(serveStub.calledOnce).to.be.true;
      expect(interceptDownloadAsync.calledOnce).to.be.true;

      filesCollection.interceptDownloadAsync = null;
    });
  });
});
