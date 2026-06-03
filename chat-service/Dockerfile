FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Hugging Face Spaces expose port 7860 by default
ENV PORT=7860
EXPOSE 7860

# Start the application
CMD ["npm", "start"]
