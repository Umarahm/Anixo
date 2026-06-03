FROM node:20-alpine

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose port (Hugging Face routes to 7860 by default if we EXPOSE 7860)
EXPOSE 7860
ENV PORT=7860

# Command to run the application
CMD [ "npm", "start" ]
