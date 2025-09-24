// Data Model Designer - Designs database schemas and data structures

import {
  Feature,
  DataModel,
  DataEntity,
  DataRelationship,
  AppType,
  FeatureType,
  ComplexityLevel,
  DataAttribute,
  ValidationRule
} from '../../models/index.js';

export class DataModelDesigner {

  /**
   * Designs a comprehensive data model based on features and app type
   */
  async design(features: Feature[], appType: AppType): Promise<DataModel> {
    try {
      // Identify core entities from features
      const entities = await this.identifyEntities(features, appType);
      
      // Define relationships between entities
      const relationships = await this.defineRelationships(entities, features);
      
      return {
        entities,
        relationships,
        constraints: [],
        indices: [],
        migrations: []
      };
    } catch (error) {
      throw new Error(`Data model design failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Identifies core entities based on features and app type
   */
  private async identifyEntities(features: Feature[], appType: AppType): Promise<DataEntity[]> {
    const entities: DataEntity[] = [];
    
    // Add base entities for most app types
    if (this.requiresUserManagement(features, appType)) {
      entities.push(this.createUserEntity());
    }
    
    // Add feature-specific entities
    features.forEach(feature => {
      const featureEntities = this.getEntitiesForFeature(feature, appType);
      entities.push(...featureEntities);
    });
    
    // Add app-type specific entities
    const appTypeEntities = this.getAppTypeEntities(appType);
    entities.push(...appTypeEntities);
    
    // Remove duplicates based on entity name
    const uniqueEntities = entities.filter((entity, index, self) => 
      index === self.findIndex(e => e.name === entity.name)
    );
    
    return uniqueEntities;
  }

  /**
   * Defines relationships between entities
   */
  private async defineRelationships(entities: DataEntity[], features: Feature[]): Promise<DataRelationship[]> {
    const relationships: DataRelationship[] = [];
    
    // Create relationships based on common patterns
    const userEntity = entities.find(e => e.name === 'User');
    if (userEntity) {
      // User-owned entities
      const ownedEntities = entities.filter(e => 
        e.name !== 'User' && this.isUserOwnedEntity(e.name)
      );
      
      ownedEntities.forEach(entity => {
        relationships.push({
          name: `User_${entity.name}`,
          type: 'one-to-many',
          from: { entity: 'User', attribute: 'id' },
          to: { entity: entity.name, attribute: 'user_id' },
          cascadeDelete: true,
          description: `A user can have multiple ${entity.name.toLowerCase()}s`
        });
      });
    }
    
    // Feature-specific relationships
    features.forEach(feature => {
      const featureRelationships = this.getRelationshipsForFeature(feature, entities);
      relationships.push(...featureRelationships);
    });
    
    return relationships;
  }

  // Helper methods for entity creation

  private createUserEntity(): DataEntity {
    return {
      name: 'User',
      description: 'System user entity',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique user identifier'
        },
        {
          name: 'email',
          type: 'varchar(255)',
          required: true,
          unique: true,
          validation: [
            {
              type: 'email',
              message: 'Must be a valid email address'
            }
          ],
          description: 'User email address'
        },
        {
          name: 'password_hash',
          type: 'varchar(255)',
          required: true,
          unique: false,
          validation: [],
          description: 'Hashed password'
        },
        {
          name: 'first_name',
          type: 'varchar(100)',
          required: false,
          unique: false,
          validation: [],
          description: 'User first name'
        },
        {
          name: 'last_name',
          type: 'varchar(100)',
          required: false,
          unique: false,
          validation: [],
          description: 'User last name'
        },
        {
          name: 'role',
          type: 'varchar(50)',
          required: true,
          unique: false,
          defaultValue: 'user',
          validation: [
            {
              type: 'enum',
              value: ['admin', 'user', 'moderator'],
              message: 'Role must be admin, user, or moderator'
            }
          ],
          description: 'User role in the system'
        },
        {
          name: 'is_active',
          type: 'boolean',
          required: true,
          unique: false,
          defaultValue: true,
          validation: [],
          description: 'Whether the user account is active'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Account creation timestamp'
        },
        {
          name: 'updated_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Last update timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private getEntitiesForFeature(feature: Feature, appType: AppType): DataEntity[] {
    const entities: DataEntity[] = [];
    
    switch (feature.type) {
      case FeatureType.FILE_UPLOAD:
        entities.push(this.createFileEntity());
        break;
        
      case FeatureType.NOTIFICATIONS:
        entities.push(this.createNotificationEntity());
        break;
        
      case FeatureType.PAYMENT:
        entities.push(
          this.createPaymentEntity(),
          this.createTransactionEntity()
        );
        break;
        
      case FeatureType.SOCIAL:
        entities.push(
          this.createPostEntity(),
          this.createFollowEntity(),
          this.createLikeEntity()
        );
        break;
        
      case FeatureType.ANALYTICS:
        entities.push(this.createEventEntity());
        break;
        
      case FeatureType.AI_INTEGRATION:
        entities.push(this.createAIConversationEntity());
        break;
        
      case FeatureType.EMAIL:
        entities.push(this.createEmailTemplateEntity());
        break;
        
      default:
        // Generic data entity for unknown feature types
        if (feature.complexity === ComplexityLevel.COMPLEX || feature.complexity === ComplexityLevel.ENTERPRISE) {
          entities.push(this.createGenericDataEntity(feature.name));
        }
    }
    
    return entities;
  }

  private createFileEntity(): DataEntity {
    return {
      name: 'File',
      description: 'Uploaded file metadata',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique file identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'File owner user ID'
        },
        {
          name: 'filename',
          type: 'varchar(255)',
          required: true,
          unique: false,
          validation: [
            {
              type: 'length',
              value: { min: 1, max: 255 },
              message: 'Filename must be between 1 and 255 characters'
            }
          ],
          description: 'Original filename'
        },
        {
          name: 'file_size',
          type: 'bigint',
          required: true,
          unique: false,
          validation: [
            {
              type: 'min',
              value: 1,
              message: 'File size must be greater than 0'
            }
          ],
          description: 'File size in bytes'
        },
        {
          name: 'mime_type',
          type: 'varchar(100)',
          required: true,
          unique: false,
          validation: [],
          description: 'File MIME type'
        },
        {
          name: 'uploaded_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Upload timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createNotificationEntity(): DataEntity {
    return {
      name: 'Notification',
      description: 'User notifications',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique notification identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Recipient user ID'
        },
        {
          name: 'title',
          type: 'varchar(255)',
          required: true,
          unique: false,
          validation: [],
          description: 'Notification title'
        },
        {
          name: 'message',
          type: 'text',
          required: true,
          unique: false,
          validation: [],
          description: 'Notification message'
        },
        {
          name: 'type',
          type: 'varchar(50)',
          required: true,
          unique: false,
          validation: [
            {
              type: 'enum',
              value: ['info', 'warning', 'error', 'success'],
              message: 'Type must be info, warning, error, or success'
            }
          ],
          description: 'Notification type'
        },
        {
          name: 'is_read',
          type: 'boolean',
          required: true,
          unique: false,
          defaultValue: false,
          validation: [],
          description: 'Whether notification has been read'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createPaymentEntity(): DataEntity {
    return {
      name: 'Payment',
      description: 'Payment records',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique payment identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Payer user ID'
        },
        {
          name: 'amount',
          type: 'decimal(10,2)',
          required: true,
          unique: false,
          validation: [
            {
              type: 'min',
              value: 0.01,
              message: 'Amount must be greater than 0'
            }
          ],
          description: 'Payment amount'
        },
        {
          name: 'currency',
          type: 'varchar(3)',
          required: true,
          unique: false,
          defaultValue: 'USD',
          validation: [],
          description: 'Payment currency code'
        },
        {
          name: 'status',
          type: 'varchar(20)',
          required: true,
          unique: false,
          validation: [
            {
              type: 'enum',
              value: ['pending', 'completed', 'failed', 'cancelled'],
              message: 'Status must be pending, completed, failed, or cancelled'
            }
          ],
          description: 'Payment status'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Payment creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createTransactionEntity(): DataEntity {
    return {
      name: 'Transaction',
      description: 'Financial transactions',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique transaction identifier'
        },
        {
          name: 'payment_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Associated payment ID'
        },
        {
          name: 'type',
          type: 'varchar(20)',
          required: true,
          unique: false,
          validation: [
            {
              type: 'enum',
              value: ['payment', 'refund', 'fee', 'adjustment'],
              message: 'Type must be payment, refund, fee, or adjustment'
            }
          ],
          description: 'Transaction type'
        },
        {
          name: 'amount',
          type: 'decimal(10,2)',
          required: true,
          unique: false,
          validation: [],
          description: 'Transaction amount'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Transaction timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createPostEntity(): DataEntity {
    return {
      name: 'Post',
      description: 'User posts for social features',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique post identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Post author user ID'
        },
        {
          name: 'title',
          type: 'varchar(255)',
          required: false,
          unique: false,
          validation: [],
          description: 'Post title'
        },
        {
          name: 'content',
          type: 'text',
          required: true,
          unique: false,
          validation: [
            {
              type: 'length',
              value: { min: 1, max: 10000 },
              message: 'Content must be between 1 and 10000 characters'
            }
          ],
          description: 'Post content'
        },
        {
          name: 'is_published',
          type: 'boolean',
          required: true,
          unique: false,
          defaultValue: false,
          validation: [],
          description: 'Whether post is published'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Post creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createFollowEntity(): DataEntity {
    return {
      name: 'Follow',
      description: 'User follow relationships',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique follow relationship identifier'
        },
        {
          name: 'follower_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Following user ID'
        },
        {
          name: 'following_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Followed user ID'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Follow relationship creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createLikeEntity(): DataEntity {
    return {
      name: 'Like',
      description: 'Post likes',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique like identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'User who liked'
        },
        {
          name: 'post_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Liked post ID'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Like timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createEventEntity(): DataEntity {
    return {
      name: 'Event',
      description: 'Analytics events',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique event identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: false,
          unique: false,
          validation: [],
          description: 'User who triggered the event'
        },
        {
          name: 'event_type',
          type: 'varchar(100)',
          required: true,
          unique: false,
          validation: [],
          description: 'Type of event'
        },
        {
          name: 'event_data',
          type: 'jsonb',
          required: false,
          unique: false,
          validation: [],
          description: 'Event data as JSON'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Event timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createAIConversationEntity(): DataEntity {
    return {
      name: 'AIConversation',
      description: 'AI conversation history',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique conversation identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'User ID'
        },
        {
          name: 'message',
          type: 'text',
          required: true,
          unique: false,
          validation: [],
          description: 'User message'
        },
        {
          name: 'response',
          type: 'text',
          required: true,
          unique: false,
          validation: [],
          description: 'AI response'
        },
        {
          name: 'model_used',
          type: 'varchar(100)',
          required: true,
          unique: false,
          validation: [],
          description: 'AI model used'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Conversation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createEmailTemplateEntity(): DataEntity {
    return {
      name: 'EmailTemplate',
      description: 'Email templates',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique template identifier'
        },
        {
          name: 'name',
          type: 'varchar(100)',
          required: true,
          unique: true,
          validation: [],
          description: 'Template name'
        },
        {
          name: 'subject',
          type: 'varchar(255)',
          required: true,
          unique: false,
          validation: [],
          description: 'Email subject template'
        },
        {
          name: 'body_html',
          type: 'text',
          required: true,
          unique: false,
          validation: [],
          description: 'HTML email body template'
        },
        {
          name: 'is_active',
          type: 'boolean',
          required: true,
          unique: false,
          defaultValue: true,
          validation: [],
          description: 'Whether template is active'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Template creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createGenericDataEntity(featureName: string): DataEntity {
    const entityName = featureName.replace(/\s+/g, '');
    return {
      name: entityName,
      description: `Data entity for ${featureName}`,
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Owner user ID'
        },
        {
          name: 'data',
          type: 'jsonb',
          required: true,
          unique: false,
          validation: [],
          description: 'Entity data as JSON'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  // Helper methods for app type specific entities

  private getAppTypeEntities(appType: AppType): DataEntity[] {
    const entities: DataEntity[] = [];
    
    switch (appType) {
      case AppType.DASHBOARD:
        entities.push(this.createDashboardEntity());
        break;
        
      case AppType.API_SERVICE:
        entities.push(this.createAPIKeyEntity());
        break;
        
      case AppType.GAME:
        entities.push(this.createGameSessionEntity());
        break;
        
      // Other app types use common entities
      default:
        break;
    }
    
    return entities;
  }

  private createDashboardEntity(): DataEntity {
    return {
      name: 'Dashboard',
      description: 'User dashboards',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique dashboard identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Dashboard owner user ID'
        },
        {
          name: 'name',
          type: 'varchar(255)',
          required: true,
          unique: false,
          validation: [],
          description: 'Dashboard name'
        },
        {
          name: 'layout',
          type: 'jsonb',
          required: true,
          unique: false,
          validation: [],
          description: 'Dashboard layout configuration'
        },
        {
          name: 'is_public',
          type: 'boolean',
          required: true,
          unique: false,
          defaultValue: false,
          validation: [],
          description: 'Whether dashboard is publicly accessible'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Dashboard creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createAPIKeyEntity(): DataEntity {
    return {
      name: 'APIKey',
      description: 'API access keys',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique API key identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'API key owner user ID'
        },
        {
          name: 'key_hash',
          type: 'varchar(255)',
          required: true,
          unique: true,
          validation: [],
          description: 'Hashed API key'
        },
        {
          name: 'name',
          type: 'varchar(100)',
          required: true,
          unique: false,
          validation: [],
          description: 'API key name'
        },
        {
          name: 'permissions',
          type: 'jsonb',
          required: true,
          unique: false,
          validation: [],
          description: 'API key permissions'
        },
        {
          name: 'is_active',
          type: 'boolean',
          required: true,
          unique: false,
          defaultValue: true,
          validation: [],
          description: 'Whether API key is active'
        },
        {
          name: 'created_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'API key creation timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  private createGameSessionEntity(): DataEntity {
    return {
      name: 'GameSession',
      description: 'Game sessions',
      attributes: [
        {
          name: 'id',
          type: 'uuid',
          required: true,
          unique: true,
          defaultValue: 'gen_random_uuid()',
          validation: [],
          description: 'Unique session identifier'
        },
        {
          name: 'user_id',
          type: 'uuid',
          required: true,
          unique: false,
          validation: [],
          description: 'Player user ID'
        },
        {
          name: 'game_data',
          type: 'jsonb',
          required: true,
          unique: false,
          validation: [],
          description: 'Game state data'
        },
        {
          name: 'score',
          type: 'integer',
          required: false,
          unique: false,
          validation: [],
          description: 'Game score'
        },
        {
          name: 'status',
          type: 'varchar(20)',
          required: true,
          unique: false,
          defaultValue: 'active',
          validation: [
            {
              type: 'enum',
              value: ['active', 'paused', 'completed', 'abandoned'],
              message: 'Status must be active, paused, completed, or abandoned'
            }
          ],
          description: 'Session status'
        },
        {
          name: 'started_at',
          type: 'timestamp',
          required: true,
          unique: false,
          defaultValue: 'CURRENT_TIMESTAMP',
          validation: [],
          description: 'Session start timestamp'
        }
      ],
      primaryKey: ['id'],
      timestamps: true,
      softDelete: false
    };
  }

  // Additional helper methods

  private requiresUserManagement(features: Feature[], appType: AppType): boolean {
    // Most app types require user management
    const noUserApps = [AppType.CLI_TOOL, AppType.AUTOMATION];
    
    if (noUserApps.includes(appType)) {
      return false;
    }
    
    // Check if any features require user management
    const userFeatures = [
      FeatureType.AUTHENTICATION,
      FeatureType.SOCIAL,
      FeatureType.NOTIFICATIONS,
      FeatureType.PAYMENT
    ];
    
    return features.some(f => userFeatures.includes(f.type));
  }

  private isUserOwnedEntity(entityName: string): boolean {
    const userOwnedEntities = [
      'File', 'Notification', 'Payment', 'Post', 'Event', 
      'AIConversation', 'Dashboard', 'APIKey', 'GameSession'
    ];
    
    return userOwnedEntities.includes(entityName);
  }

  private getRelationshipsForFeature(feature: Feature, entities: DataEntity[]): DataRelationship[] {
    const relationships: DataRelationship[] = [];
    
    // Add feature-specific relationships
    switch (feature.type) {
      case FeatureType.PAYMENT:
        if (entities.some(e => e.name === 'Payment') && entities.some(e => e.name === 'Transaction')) {
          relationships.push({
            name: 'Payment_Transaction',
            type: 'one-to-many',
            from: { entity: 'Payment', attribute: 'id' },
            to: { entity: 'Transaction', attribute: 'payment_id' },
            cascadeDelete: true,
            description: 'A payment can have multiple transactions'
          });
        }
        break;
        
      case FeatureType.SOCIAL:
        if (entities.some(e => e.name === 'Post') && entities.some(e => e.name === 'Like')) {
          relationships.push({
            name: 'Post_Like',
            type: 'one-to-many',
            from: { entity: 'Post', attribute: 'id' },
            to: { entity: 'Like', attribute: 'post_id' },
            cascadeDelete: true,
            description: 'A post can have multiple likes'
          });
        }
        break;
    }
    
    return relationships;
  }
}
