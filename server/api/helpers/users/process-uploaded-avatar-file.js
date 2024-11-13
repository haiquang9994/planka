const { rimraf } = require('rimraf');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');

module.exports = {
  inputs: {
    file: {
      type: 'json',
      required: true,
    },
  },

  exits: {
    fileIsNotImage: {},
  },

  async fn(inputs) {
    let image = sharp(inputs.file.fd, {
      animated: true,
    });

    let metadata;
    try {
      metadata = await image.metadata();
    } catch (error) {
      throw 'fileIsNotImage';
    }

    if (['svg', 'pdf'].includes(metadata.format)) {
      throw 'fileIsNotImage';
    }

    const fileManager = sails.hooks['file-manager'].getInstance();

    const dirname = uuid();
    const dirPathSegment = `${sails.config.custom.userAvatarsPathSegment}/${dirname}`;

    let { width, pageHeight: height = metadata.height } = metadata;
    if (metadata.orientation && metadata.orientation > 4) {
      [image, width, height] = [image.rotate(), height, width];
    }

    const extension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;

    try {
      const originalBuffer = await image.toBuffer();

      await fileManager.save(
        `${dirPathSegment}/original.${extension}`,
        originalBuffer,
        { contentType: inputs.file.type, isPublic: true },
      );

      const square100Buffer = await image
        .resize(
          100,
          100,
          width < 100 || height < 100
            ? {
                kernel: sharp.kernel.nearest,
              }
            : undefined,
        )
        .toBuffer();

      await fileManager.save(
        `${dirPathSegment}/square-100.${extension}`,
        square100Buffer,
        { contentType: inputs.file.type, isPublic: true },
      );
    } catch (error1) {
      console.warn(error1.stack); // eslint-disable-line no-console

      try {
        fileManager.deleteDir(dirPathSegment);
      } catch (error2) {
        console.warn(error2.stack); // eslint-disable-line no-console
      }

      throw 'fileIsNotImage';
    }

    try {
      await rimraf(inputs.file.fd);
    } catch (error) {
      console.warn(error.stack); // eslint-disable-line no-console
    }

    return {
      dirname,
      extension,
    };
  },
};
