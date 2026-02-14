variable "aws_region" {
  description = "AWS Region"
  default     = "us-east-1"
}

variable "instance_type" {
  description = "EC2 Instance Type"
  default     = "t2.micro"
}

variable "ami_id" {
  description = "AMI ID for Ubuntu 22.04 LTS (Update per region)"
  default     = "ami-0c7217cdde317cfec" # Example for us-east-1
}

variable "public_key" {
  description = "Public SSH key for instance access"
  type        = string
}
