const fs = require('fs');
const {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

class S3FileManager {
  constructor(client) {
    this.client = client;
  }

  async move(sourceFilePath, filePathSegment, options = {}) {
    const command = new PutObjectCommand({
      Bucket: sails.config.custom.s3Bucket,
      Key: filePathSegment,
      Body: fs.createReadStream(sourceFilePath),
      ContentType: options.contentType || undefined,
      ACL: options.isPublic ? 'public-read' : undefined,
    });

    await this.client.send(command);

    return null;
  }

  async save(filePathSegment, buffer, options = {}) {
    const command = new PutObjectCommand({
      Bucket: sails.config.custom.s3Bucket,
      Key: filePathSegment,
      Body: buffer,
      ContentType: options.contentType || undefined,
      ACL: options.isPublic ? 'public-read' : undefined,
    });

    await this.client.send(command);
  }

  async read(filePathSegment) {
    const command = new GetObjectCommand({
      Bucket: sails.config.custom.s3Bucket,
      Key: filePathSegment,
    });

    const result = await this.client.send(command);
    return result.Body;
  }

  async deleteDir(dirPathSegment) {
    const listObjectsCommand = new ListObjectsV2Command({
      Bucket: sails.config.custom.s3Bucket,
      Prefix: dirPathSegment,
    });

    const result = await this.client.send(listObjectsCommand);

    if (!result.Contents || result.Contents.length === 0) {
      return;
    }

    const deleteObjectsCommand = new DeleteObjectsCommand({
      Bucket: sails.config.custom.s3Bucket,
      Delete: {
        Objects: result.Contents.map(({ Key }) => ({ Key })),
      },
    });

    await this.client.send(deleteObjectsCommand);
  }

  // eslint-disable-next-line class-methods-use-this
  buildUrl(filePathSegment) {
    return `${sails.hooks.s3.getBaseUrl()}/${filePathSegment}`;
  }
}

module.exports = S3FileManager;
